import { useEffect, useMemo, useState } from 'react';
import { AuthForm } from '../components/AuthForm';
import { DashboardPage } from '../pages/DashboardPage';
import { inventoryData } from '../data/inventoryData';
import { api } from '../services/api';
import { validateAuthForm, validateProductForm } from '../utils/validateForm';
import '../styles/app.css';

const initialFormState = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function App() {
  const [screen, setScreen] = useState(() => {
    const savedUser = localStorage.getItem('inventory-user');
    if (!savedUser) return 'login';

    try {
      const parsed = JSON.parse(savedUser);
      return parsed?.role === 'admin' ? 'dashboard' : 'catalog';
    } catch {
      return 'login';
    }
  });
  const [selectedCategory, setSelectedCategory] = useState('construction');
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('inventory-user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [products, setProducts] = useState({ construction: [], hardware: [] });
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [invoice, setInvoice] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    brand: '',
    quantity: '',
    price: '',
    rating: '4.5',
    image: '',
    description: '',
  });
  const [editingProductId, setEditingProductId] = useState(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await api.products.list();
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Unable to load products');

        const groupedProducts = { construction: [], hardware: [] };
        result.data.forEach((product) => {
          if (groupedProducts[product.category]) {
            groupedProducts[product.category].push({
              ...product,
              id: product._id || product.id,
            });
          }
        });
        setProducts(groupedProducts);
      } catch (error) {
        setMessage({ type: 'error', text: error.message || 'Unable to load products.' });
      }
    };

    loadProducts();
  }, []);

  const isAdmin = currentUser?.role === 'admin';
  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const stockRows = useMemo(
    () =>
      Object.entries(products).flatMap(([categoryKey, items]) =>
        items.map((item) => ({
          category: categoryKey === 'construction' ? 'Construction' : 'Hardware',
          product: item.name,
          quantity: item.quantity,
          price: item.price,
          status: item.quantity > 0 ? 'Available' : 'Out of stock',
        }))
      ),
    [products]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setMessage({ type: '', text: '' });
  };

  const handleLogout = () => {
    localStorage.removeItem('inventory-token');
    localStorage.removeItem('inventory-user');
    setCurrentUser(null);
    setScreen('login');
    setIsLogin(true);
    setFormData(initialFormState);
    setCart([]);
    setInvoice(null);
    setMessage({ type: '', text: '' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateAuthForm(formData, isLogin);
    if (validationErrors.length) {
      setMessage({ type: 'error', text: validationErrors.join(' ') });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    const endpoint = isLogin ? api.auth.login : api.auth.signup;
    const payload = isLogin
      ? { email: formData.email, password: formData.password }
      : {
          name: formData.name,
          email: formData.email,
          password: formData.password,
        };

    try {
      const response = await endpoint(payload);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      const user = data.data?.user || {};
      const token = data.data?.token || '';

      localStorage.setItem('inventory-token', token);
      localStorage.setItem('inventory-user', JSON.stringify(user));
      setCurrentUser(user);
      setFormData(initialFormState);
      setMessage({ type: 'success', text: isLogin ? 'Welcome back! Login successful.' : 'Account created successfully.' });
      setScreen(user?.role === 'admin' ? 'dashboard' : 'catalog');
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    if (isAdmin) {
      setMessage({ type: 'error', text: 'Admin users manage stock rather than place orders.' });
      return;
    }
    if (!Number.isSafeInteger(product.quantity) || product.quantity < 1) {
      setMessage({ type: 'error', text: 'This product is out of stock.' });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id && item.category === selectedCategory);

      if (existing) {
        const nextQty = existing.quantity + 1;
        if (nextQty > product.quantity) {
          setMessage({ type: 'error', text: 'Requested quantity exceeds current stock.' });
          return prev;
        }

        return prev.map((item) =>
          item.id === product.id && item.category === selectedCategory
            ? { ...item, quantity: nextQty }
            : item
        );
      }

      return [...prev, { id: product.id, category: selectedCategory, name: product.name, brand: product.brand, price: product.price, quantity: 1 }];
    });

    setMessage({ type: 'success', text: `${product.name} added to cart.` });
  };

  const updateCartItem = (id, delta) => {
    setCart((prev) => {
      const currentItem = prev.find((item) => item.id === id);
      if (!currentItem) return prev;

      const nextQuantity = currentItem.quantity + delta;
      const stock = products[currentItem.category].find((product) => product.id === id)?.quantity || 0;
      if (nextQuantity > stock) {
        setMessage({ type: 'error', text: 'Requested quantity exceeds current stock.' });
        return prev;
      }

      return prev
        .map((item) => {
          if (item.id !== id) return item;
          if (nextQuantity <= 0) return null;
          return { ...item, quantity: nextQuantity };
        })
        .filter(Boolean);
    });
  };

  const removeCartItem = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCheckout = async () => {
    if (!cart.length) {
      setMessage({ type: 'error', text: 'Your cart is empty.' });
      return;
    }

    const cartStock = cart.map((item) => ({
      ...item,
      available: products[item.category].find((product) => product.id === item.id)?.quantity || 0,
    }));

    const invalid = cartStock.some((item) => item.quantity > item.available);
    if (invalid) {
      setMessage({ type: 'error', text: 'One or more products are no longer available in stock.' });
      return;
    }

    setLoading(true);
    try {
      const response = await api.orders.create({
        paymentMethod,
        items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to place order');

      const order = result.data;
      setProducts((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((categoryKey) => {
          updated[categoryKey] = updated[categoryKey].map((product) => {
            const orderedItem = order.items.find((item) => item.productId === product.id);
            return orderedItem
              ? { ...product, quantity: product.quantity - orderedItem.quantity }
              : product;
          });
        });
        return updated;
      });
      setInvoice({
        invoiceNumber: order.invoiceNumber,
        customerName: order.customerName,
        paymentMethod: order.paymentMethod,
        items: order.items.map((item) => ({
          id: item.productId,
          name: item.name,
          brand: item.brand,
          price: item.price,
          quantity: item.quantity,
        })),
        total: order.total,
        createdAt: order.createdAt,
      });
      setCart([]);
      setMessage({ type: 'success', text: 'Order placed and invoice generated.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to place order.' });
    } finally {
      setLoading(false);
    }
  };

  const handleProductSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      name: productForm.name,
      brand: productForm.brand.trim(),
      category: selectedCategory,
      quantity: Number(productForm.quantity),
      price: Number(productForm.price),
      rating: Number(productForm.rating) || 4.5,
      image: productForm.image || 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80',
      description: productForm.description.trim(),
    };
    payload.name = payload.name.trim();
    const validationErrors = validateProductForm(productForm);
    if (validationErrors.length) {
      setMessage({ type: 'error', text: validationErrors.join(' ') });
      return;
    }

    setLoading(true);
    try {
      const response = editingProductId
        ? await api.products.update(editingProductId, payload)
        : await api.products.create(payload);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to save product');

      const savedProduct = { ...result.data, id: result.data._id || result.data.id };
      setProducts((prev) => {
        const currentList = prev[savedProduct.category] || [];
        return {
          ...prev,
          [savedProduct.category]: editingProductId
            ? currentList.map((item) => (item.id === savedProduct.id ? savedProduct : item))
            : [savedProduct, ...currentList],
        };
      });
      setProductForm({ name: '', brand: '', quantity: '', price: '', rating: '4.5', image: '', description: '' });
      setEditingProductId(null);
      setMessage({ type: 'success', text: editingProductId ? 'Product updated successfully.' : 'Product added successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to save product.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProductId(product.id);
    setSelectedCategory(product.category || selectedCategory);
    setProductForm({
      name: product.name,
      brand: product.brand,
      quantity: String(product.quantity),
      price: String(product.price),
      rating: String(product.rating),
      image: product.image,
      description: product.description || '',
    });
  };

  const handleDeleteProduct = async (productId) => {
    try {
      const response = await api.products.remove(productId);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to delete product');

      setProducts((prev) => ({
        ...prev,
        [selectedCategory]: (prev[selectedCategory] || []).filter((item) => item.id !== productId),
      }));
      setMessage({ type: 'success', text: 'Product deleted successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to delete product.' });
    }
  };

  const renderAdminDashboard = () => (
    <DashboardPage
      userName={currentUser?.name || 'Admin'}
      onLogout={handleLogout}
      onOpenCategory={(category) => {
        setSelectedCategory(category);
        setScreen(category);
      }}
      stockData={stockRows}
    />
  );

  const renderCategoryManagementPage = () => {
    const items = products[selectedCategory] || [];
    const title = selectedCategory === 'construction' ? 'Construction' : 'Hardware';

    return (
      <div className="section-page">
        <div className="page-shell section-shell">
          <header className="page-header">
            <div>
              <p className="eyebrow">Management</p>
              <h1>{title}</h1>
            </div>
            <div className="page-actions">
              <button type="button" className="secondary-button" onClick={() => setScreen('dashboard')}>
                Dashboard
              </button>
              <button type="button" className="ghost-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </header>

          {message.text && (
            <div
              className={message.type === 'success' ? 'status success' : 'status error'}
              role={message.type === 'success' ? 'status' : 'alert'}
            >
              {message.text}
            </div>
          )}

          <div className="category-switcher">
            <button type="button" className={selectedCategory === 'construction' ? 'switch-button active' : 'switch-button'} onClick={() => setSelectedCategory('construction')}>
              Construction
            </button>
            <button type="button" className={selectedCategory === 'hardware' ? 'switch-button active' : 'switch-button'} onClick={() => setSelectedCategory('hardware')}>
              Hardware
            </button>
          </div>

          <div className="admin-form-box">
            <h3>{editingProductId ? 'Update product' : 'Add new product'}</h3>
            <form onSubmit={handleProductSubmit} className="product-form-grid">
              <input type="text" aria-label="Product name" placeholder="Product name" required minLength={2} maxLength={120} value={productForm.name} onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))} />
              <input type="text" aria-label="Brand name" placeholder="Brand name" required minLength={2} maxLength={80} value={productForm.brand} onChange={(e) => setProductForm((prev) => ({ ...prev, brand: e.target.value }))} />
              <input type="number" aria-label="Quantity" min="0" max="1000000" step="1" placeholder="Quantity" required value={productForm.quantity} onChange={(e) => setProductForm((prev) => ({ ...prev, quantity: e.target.value }))} />
              <input type="number" aria-label="Price" min="0" max="1000000000" step="0.01" placeholder="Price" required value={productForm.price} onChange={(e) => setProductForm((prev) => ({ ...prev, price: e.target.value }))} />
              <input type="number" aria-label="Rating" min="1" max="5" step="0.1" placeholder="Rating" value={productForm.rating} onChange={(e) => setProductForm((prev) => ({ ...prev, rating: e.target.value }))} />
              <input type="text" aria-label="Image URL" placeholder="Image URL" maxLength={2048} value={productForm.image} onChange={(e) => setProductForm((prev) => ({ ...prev, image: e.target.value }))} />
              <textarea aria-label="Description" placeholder="Description" maxLength={2000} value={productForm.description} onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))} />
              <button type="submit" className="primary-button" disabled={loading}>{editingProductId ? 'Update product' : 'Add product'}</button>
            </form>
          </div>

          <div className="product-grid">
            {items.map((product) => (
              <div key={product.id} className="product-card">
                <img src={product.image} alt={product.name} className="product-image" />
                <div className="product-body">
                  <div className="product-header-row">
                    <div>
                      <h3>{product.name}</h3>
                      <p className="brand-name">{product.brand}</p>
                    </div>
                    <div className="rating-box">★ {product.rating}</div>
                  </div>
                  <div className="product-meta-line">
                    <span>Qty: {product.quantity}</span>
                    <strong>₹{product.price}</strong>
                  </div>
                  <div className="admin-actions">
                    <button type="button" className="secondary-button small" onClick={() => handleEditProduct({ ...product, category: selectedCategory })}>
                      Edit
                    </button>
                    <button type="button" className="ghost-button small" onClick={() => handleDeleteProduct(product.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderUserCatalog = () => {
    const items = products[selectedCategory] || [];

    return (
      <div className="catalog-page">
        <div className="page-shell">
          <header className="page-header">
            <div>
              <p className="eyebrow">Product Catalog</p>
              <h1>{selectedCategory === 'construction' ? 'Construction' : 'Hardware'}</h1>
            </div>
            <button type="button" className="ghost-button" onClick={handleLogout}>
              Logout
            </button>
          </header>

          {message.text && (
            <div className={message.type === 'success' ? 'status success' : 'status error'} role="status">
              {message.text}
            </div>
          )}

          <div className="category-switcher">
            <button type="button" className={selectedCategory === 'construction' ? 'switch-button active' : 'switch-button'} onClick={() => setSelectedCategory('construction')}>
              Construction
            </button>
            <button type="button" className={selectedCategory === 'hardware' ? 'switch-button active' : 'switch-button'} onClick={() => setSelectedCategory('hardware')}>
              Hardware
            </button>
          </div>

          <div className="catalog-grid">
            {items.map((product) => (
              <div key={product.id} className="product-card">
                <img src={product.image} alt={product.name} className="product-image" />
                <div className="product-body">
                  <div className="product-header-row">
                    <div>
                      <h3>{product.name}</h3>
                      <p className="brand-name">{product.brand}</p>
                    </div>
                    <div className="rating-box">★ {product.rating}</div>
                  </div>
                  <div className="product-meta-line">
                    <span>Qty: {product.quantity}</span>
                    <strong>₹{product.price}</strong>
                  </div>
                  <button type="button" className="primary-button small" onClick={() => addToCart(product)}>
                    Add to cart
                  </button>
                </div>
              </div>
            ))}
          </div>

          <aside className="cart-panel">
            <h3>Cart</h3>
            {cart.length === 0 ? (
              <p className="empty-message">No items added yet.</p>
            ) : (
              <div className="cart-items">
                {cart.map((item) => (
                  <div key={`${item.category}-${item.id}`} className="cart-item">
                    <div>
                      <strong>{item.name}</strong>
                      <p>{item.brand}</p>
                    </div>
                    <div className="quantity-controls">
                      <button type="button" onClick={() => updateCartItem(item.id, -1)}>−</button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => updateCartItem(item.id, 1)}>+</button>
                    </div>
                    <button type="button" className="remove-button" onClick={() => removeCartItem(item.id)}>Remove</button>
                  </div>
                ))}
              </div>
            )}

            <div className="payment-box">
              <h4>Payment method</h4>
              <label><input type="radio" name="paymentMethod" checked={paymentMethod === 'UPI'} onChange={() => setPaymentMethod('UPI')} /> UPI</label>
              <label><input type="radio" name="paymentMethod" checked={paymentMethod === 'Cash'} onChange={() => setPaymentMethod('Cash')} /> Cash</label>
            </div>

            <div className="cart-summary-row">
              <span>Total</span>
              <strong>₹{cartTotal}</strong>
            </div>
            <button type="button" className="primary-button" onClick={handleCheckout} disabled={loading}>{loading ? 'Processing…' : 'Buy now'}</button>
          </aside>

          {invoice && (
            <div className="invoice-box">
              <div className="invoice-header">
                <div>
                  <p className="eyebrow">Invoice</p>
                  <h3>{invoice.invoiceNumber}</h3>
                </div>
                <button type="button" className="secondary-button" onClick={() => window.print()}>
                  Print invoice
                </button>
              </div>
              <div className="invoice-details">
                <p>Customer: {invoice.customerName}</p>
                <p>Payment: {invoice.paymentMethod}</p>
                <p>Date: {new Date(invoice.createdAt).toLocaleString()}</p>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={`${invoice.invoiceNumber}-${item.id}`}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>₹{item.price}</td>
                      <td>₹{item.price * item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="invoice-total">
                <span>Total Amount</span>
                <strong>₹{invoice.total}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!currentUser) {
    return (
      <AuthForm
        isLogin={isLogin}
        formData={formData}
        loading={loading}
        message={message}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onToggleMode={setIsLogin}
      />
    );
  }

  if (isAdmin) {
    if (screen === 'dashboard') return renderAdminDashboard();
    if (screen === 'construction' || screen === 'hardware') return renderCategoryManagementPage();
    return renderAdminDashboard();
  }

  if (screen === 'catalog' || screen === 'construction' || screen === 'hardware') {
    return renderUserCatalog();
  }

  return renderUserCatalog();
}

export default App;
