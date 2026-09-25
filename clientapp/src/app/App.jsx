import { useMemo, useState } from 'react';
import { AuthForm } from '../components/AuthForm';
import { DashboardPage } from '../pages/DashboardPage';
import { inventoryData } from '../data/inventoryData';
import { api } from '../services/api';
import '../styles/app.css';

const initialFormState = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'user',
};

const productSeed = {
  construction: [
    { id: 1, name: 'TMT Steel Rod 12mm', brand: 'SteelMax', quantity: 48, price: 190, rating: 4.8, image: 'https://images.unsplash.com/photo-1581092921461-eab62e97a4f1?auto=format&fit=crop&w=900&q=80' },
    { id: 2, name: 'TMT Bar 16mm', brand: 'BuildStrong', quantity: 32, price: 260, rating: 4.7, image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80' },
    { id: 3, name: 'Construction Beam Set', brand: 'IronCore', quantity: 18, price: 440, rating: 4.9, image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=80' },
  ],
  hardware: [
    { id: 4, name: 'PVC Pipe 2 inch', brand: 'FlowPro', quantity: 60, price: 120, rating: 4.6, image: 'https://images.unsplash.com/photo-1581092335399-7f0dfb056f9c?auto=format&fit=crop&w=900&q=80' },
    { id: 5, name: 'GI Pipe 1 inch', brand: 'PipeElite', quantity: 22, price: 210, rating: 4.7, image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80' },
    { id: 6, name: 'Pipe Fittings Kit', brand: 'ReadyFlow', quantity: 14, price: 320, rating: 4.8, image: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=900&q=80' },
  ],
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
  const [products, setProducts] = useState(productSeed);
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
  });
  const [editingProductId, setEditingProductId] = useState(null);

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
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      setLoading(false);
      return;
    }

    const endpoint = isLogin ? api.auth.login : api.auth.signup;
    const payload = isLogin
      ? { email: formData.email, password: formData.password }
      : {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
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
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          return { ...item, quantity: nextQty };
        })
        .filter(Boolean)
    );
  };

  const removeCartItem = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCheckout = () => {
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

    setProducts((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((categoryKey) => {
        updated[categoryKey] = updated[categoryKey].map((product) => {
          const cartItem = cart.find((item) => item.category === categoryKey && item.id === product.id);
          if (!cartItem) return product;
          return { ...product, quantity: Number(product.quantity) - Number(cartItem.quantity) };
        });
      });
      return updated;
    });

    setInvoice({
      invoiceNumber: `INV-${Date.now()}`,
      customerName: currentUser?.name || 'Customer',
      paymentMethod,
      items: cart,
      total: cartTotal,
      createdAt: new Date().toISOString(),
    });
    setCart([]);
    setMessage({ type: 'success', text: 'Invoice generated successfully.' });
  };

  const handleProductSubmit = (event) => {
    event.preventDefault();

    const payload = {
      id: editingProductId || Date.now(),
      name: productForm.name,
      brand: productForm.brand,
      quantity: Number(productForm.quantity),
      price: Number(productForm.price),
      rating: Number(productForm.rating) || 4.5,
      image: productForm.image || 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80',
    };

    setProducts((prev) => {
      const currentList = prev[selectedCategory] || [];
      const updatedList = editingProductId
        ? currentList.map((item) => (item.id === editingProductId ? payload : item))
        : [payload, ...currentList];

      return {
        ...prev,
        [selectedCategory]: updatedList,
      };
    });

    setProductForm({
      name: '',
      brand: '',
      quantity: '',
      price: '',
      rating: '4.5',
      image: '',
    });
    setEditingProductId(null);
    setMessage({ type: 'success', text: editingProductId ? 'Product updated successfully.' : 'Product added successfully.' });
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
    });
  };

  const handleDeleteProduct = (productId) => {
    setProducts((prev) => ({
      ...prev,
      [selectedCategory]: (prev[selectedCategory] || []).filter((item) => item.id !== productId),
    }));
    setMessage({ type: 'success', text: 'Product deleted successfully.' });
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
              <input type="text" placeholder="Product name" value={productForm.name} onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))} />
              <input type="text" placeholder="Brand name" value={productForm.brand} onChange={(e) => setProductForm((prev) => ({ ...prev, brand: e.target.value }))} />
              <input type="number" min="0" placeholder="Quantity" value={productForm.quantity} onChange={(e) => setProductForm((prev) => ({ ...prev, quantity: e.target.value }))} />
              <input type="number" min="0" step="0.01" placeholder="Price" value={productForm.price} onChange={(e) => setProductForm((prev) => ({ ...prev, price: e.target.value }))} />
              <input type="number" min="1" max="5" step="0.1" placeholder="Rating" value={productForm.rating} onChange={(e) => setProductForm((prev) => ({ ...prev, rating: e.target.value }))} />
              <input type="text" placeholder="Image URL" value={productForm.image} onChange={(e) => setProductForm((prev) => ({ ...prev, image: e.target.value }))} />
              <button type="submit" className="primary-button">{editingProductId ? 'Update product' : 'Add product'}</button>
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
            <button type="button" className="primary-button" onClick={handleCheckout}>Buy now</button>
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
