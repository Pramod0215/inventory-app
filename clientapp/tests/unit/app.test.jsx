import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  listProducts: vi.fn(),
  createOrder: vi.fn(),
  listOrders: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  removeProduct: vi.fn(),
  login: vi.fn(),
  signup: vi.fn(),
}));

vi.mock('../../src/services/api.js', () => ({
  api: {
    products: {
      list: apiMocks.listProducts,
      create: apiMocks.createProduct,
      update: apiMocks.updateProduct,
      remove: apiMocks.removeProduct,
    },
    orders: {
      create: apiMocks.createOrder,
      list: apiMocks.listOrders,
    },
    auth: { login: apiMocks.login, signup: apiMocks.signup },
  },
}));

import App from '../../src/app/App.jsx';

const product = {
  _id: '507f1f77bcf86cd799439012',
  name: 'TMT Steel Rod 12mm',
  brand: 'SteelMax',
  category: 'construction',
  quantity: 4,
  price: 190,
  rating: 4.8,
  image: '/steel.jpg',
};

beforeEach(() => {
  localStorage.setItem('inventory-user', JSON.stringify({
    id: '507f1f77bcf86cd799439011',
    name: 'Customer',
    role: 'user',
  }));
  apiMocks.listProducts.mockResolvedValue({
    ok: true,
    json: async () => ({ data: [product] }),
  });
  apiMocks.createOrder.mockResolvedValue({
    ok: true,
    json: async () => ({
      data: {
        invoiceNumber: 'INV-UNIT-1',
        customerName: 'Customer',
        paymentMethod: 'UPI',
        items: [{
          productId: product._id,
          name: product.name,
          brand: product.brand,
          price: product.price,
          quantity: 1,
        }],
        total: product.price,
        createdAt: '2026-10-30T12:00:00.000Z',
      },
    }),
  });
});

describe('storefront checkout', () => {
  it('loads the catalog, adds an item, and places an order for a saved invoice', async () => {
    apiMocks.createOrder.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          invoiceNumber: 'INV-UNIT-1',
          customerName: 'Customer',
          paymentMethod: 'Cash',
          items: [{
            productId: product._id,
            name: product.name,
            brand: product.brand,
            price: product.price,
            quantity: 1,
          }],
          total: product.price,
          createdAt: '2026-10-30T12:00:00.000Z',
        },
      }),
    });
    render(<App />);

    expect(await screen.findByText(product.name)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    fireEvent.click(screen.getByLabelText('Cash'));
    fireEvent.click(screen.getByRole('button', { name: 'Buy now' }));

    await waitFor(() => {
      expect(apiMocks.createOrder).toHaveBeenCalledWith({
        paymentMethod: 'Cash',
        items: [{ productId: product._id, quantity: 1 }],
      });
    });
    expect(await screen.findByText('INV-UNIT-1')).toBeInTheDocument();
    expect(screen.getByText('Order placed and invoice generated.')).toBeInTheDocument();
    expect(screen.getByText('Payment: Cash')).toBeInTheDocument();
  });

  it('does not send an empty cart to checkout', async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Buy now' }));

    expect(await screen.findByText('Your cart is empty.')).toBeInTheDocument();
    expect(apiMocks.createOrder).not.toHaveBeenCalled();
  });

  it('shows API errors when catalog loading fails', async () => {
    apiMocks.listProducts.mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Catalog unavailable' }),
    });

    render(<App />);

    expect(await screen.findByText('Catalog unavailable')).toBeInTheDocument();
  });

  it('skips products with unsupported categories and handles a missing catalog data array', async () => {
    apiMocks.listProducts.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [
        product,
        { ...product, _id: 'unknown-1', category: 'unknown' },
        { ...product, _id: undefined, id: 'legacy-id', category: 'hardware' },
      ] }),
    });

    render(<App />);

    expect(await screen.findByText(product.name)).toBeInTheDocument();
    expect(screen.queryByText('unknown-1')).not.toBeInTheDocument();
  });

  it('shows a useful error when the catalog response has no product list', async () => {
    apiMocks.listProducts.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    render(<App />);

    expect(await screen.findByRole('status')).toHaveTextContent('Cannot read properties of undefined');
  });

  it('updates cart quantity and reflects it in the submitted order', async () => {
    render(<App />);

    await screen.findByText(product.name);
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buy now' }));

    await waitFor(() => {
      expect(apiMocks.createOrder).toHaveBeenCalledWith({
        paymentMethod: 'UPI',
        items: [{ productId: product._id, quantity: 2 }],
      });
    });
  });

  it('removes a cart item and prevents ordering the emptied cart', async () => {
    render(<App />);

    await screen.findByText(product.name);
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buy now' }));

    expect(apiMocks.createOrder).not.toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent('Your cart is empty.');
  });

  it('preserves the cart and displays checkout errors when the order is rejected', async () => {
    apiMocks.createOrder.mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Insufficient stock' }),
    });
    render(<App />);

    await screen.findByText(product.name);
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buy now' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Insufficient stock');
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.queryByText('INV-UNIT-1')).not.toBeInTheDocument();
  });

  it('rejects adding items when the user has administrator access', async () => {
    localStorage.setItem('inventory-user', JSON.stringify({
      id: '507f1f77bcf86cd799439011',
      name: 'Store Admin',
      role: 'admin',
    }));
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Welcome Store Admin' })).toBeInTheDocument();
    expect(apiMocks.createOrder).not.toHaveBeenCalled();
  });

  it('signs up a customer and routes the saved user to the catalog', async () => {
    localStorage.clear();
    apiMocks.signup.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          token: 'new-token',
          user: { id: 'new-user', name: 'New Customer', role: 'user' },
        },
      }),
    });

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'New Customer' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret12' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'secret12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('heading', { name: 'Construction' })).toBeInTheDocument();
    expect(apiMocks.signup).toHaveBeenCalledWith({
      name: 'New Customer',
      email: 'new@example.com',
      password: 'secret12',
    });
    expect(localStorage.getItem('inventory-token')).toBe('new-token');
    expect(JSON.parse(localStorage.getItem('inventory-user'))).toMatchObject({ role: 'user' });
  });

  it('recovers from invalid stored user data and completes login', async () => {
    localStorage.clear();
    localStorage.setItem('inventory-user', '{invalid json');
    apiMocks.login.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { token: 'login-token', user: { id: 'login-user', name: 'Customer', role: 'user' } },
      }),
    });
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'customer@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret12' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Login' })[1]);

    expect(await screen.findByRole('heading', { name: 'Construction' })).toBeInTheDocument();
    expect(apiMocks.login).toHaveBeenCalledWith({
      email: 'customer@example.com',
      password: 'secret12',
    });
    expect(localStorage.getItem('inventory-token')).toBe('login-token');
  });

  it('shows a default error when signup response has no message', async () => {
    localStorage.clear();
    apiMocks.signup.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Customer' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret12' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'secret12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Authentication failed')).toBeInTheDocument();
  });

  it('blocks invalid signup details before sending an API request', async () => {
    localStorage.clear();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));
    fireEvent.submit(screen.getByRole('button', { name: 'Create account' }).closest('form'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Name must contain between 2 and 80 characters.');
    expect(apiMocks.signup).not.toHaveBeenCalled();
  });

  it('shows the configured checkout payment method and reports local stock limits', async () => {
    render(<App />);

    await screen.findByText(product.name);
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Requested quantity exceeds current stock.');
    expect(apiMocks.createOrder).not.toHaveBeenCalled();
  });

  it('prevents adding an out-of-stock product to the cart', async () => {
    apiMocks.listProducts.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ ...product, quantity: 0 }] }),
    });
    render(<App />);

    await screen.findByText(product.name);
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    expect(await screen.findByRole('status')).toHaveTextContent('This product is out of stock.');
    expect(screen.getByText('No items added yet.')).toBeInTheDocument();
    expect(apiMocks.createOrder).not.toHaveBeenCalled();
  });

  it('prevents increasing cart quantity beyond available stock', async () => {
    apiMocks.listProducts.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ ...product, quantity: 1 }] }),
    });
    render(<App />);

    await screen.findByText(product.name);
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    fireEvent.click(screen.getByRole('button', { name: '+' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Requested quantity exceeds current stock.');
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('routes administrators to category management and creates, edits, and deletes products', async () => {
    localStorage.setItem('inventory-user', JSON.stringify({
      id: 'admin-1',
      name: 'Store Admin',
      role: 'admin',
    }));
    apiMocks.createProduct.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { ...product, _id: 'new-product', name: 'New Pipe', category: 'construction' } }),
    });
    apiMocks.updateProduct.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { ...product, name: 'Updated Pipe' } }),
    });
    apiMocks.removeProduct.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: product._id } }),
    });
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Construction' }));
    expect(screen.getByRole('heading', { name: 'Construction' })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Product name'), { target: { value: 'New Pipe' } });
    fireEvent.change(screen.getByPlaceholderText('Brand name'), { target: { value: 'FlowPro' } });
    fireEvent.change(screen.getByPlaceholderText('Quantity'), { target: { value: '5' } });
    fireEvent.change(screen.getByPlaceholderText('Price'), { target: { value: '55' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }));
    expect(await screen.findByRole('heading', { name: 'New Pipe' })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    expect(screen.getByPlaceholderText('Product name')).toHaveValue('New Pipe');
    fireEvent.change(screen.getByPlaceholderText('Product name'), { target: { value: 'Updated Pipe' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update product' }));
    expect(await screen.findByRole('heading', { name: 'Updated Pipe' })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    await waitFor(() => expect(apiMocks.removeProduct).toHaveBeenCalledWith('new-product'));
  });

  it('shows admin product create, update, and delete errors', async () => {
    localStorage.setItem('inventory-user', JSON.stringify({
      id: 'admin-1',
      name: 'Store Admin',
      role: 'admin',
    }));
    apiMocks.createProduct.mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Create rejected' }),
    });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Construction' }));
    fireEvent.change(screen.getByPlaceholderText('Product name'), { target: { value: 'New Pipe' } });
    fireEvent.change(screen.getByPlaceholderText('Brand name'), { target: { value: 'FlowPro' } });
    fireEvent.change(screen.getByPlaceholderText('Quantity'), { target: { value: '5' } });
    fireEvent.change(screen.getByPlaceholderText('Price'), { target: { value: '55' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Create rejected');

    apiMocks.createProduct.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { ...product, _id: 'product-1', name: 'Created Pipe', category: 'construction' },
      }),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }));
    expect(await screen.findByRole('heading', { name: 'Created Pipe' })).toBeInTheDocument();

    apiMocks.updateProduct.mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Update rejected' }),
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Update product' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Update rejected');

    apiMocks.removeProduct.mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Delete rejected' }),
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Delete rejected');
  });

  it('falls back to generic product action errors when the API does not include a message', async () => {
    localStorage.setItem('inventory-user', JSON.stringify({
      id: 'admin-1',
      name: 'Store Admin',
      role: 'admin',
    }));
    apiMocks.createProduct.mockRejectedValue(new Error('Network failed'));
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Construction' }));
    fireEvent.change(screen.getByPlaceholderText('Product name'), { target: { value: 'New Pipe' } });
    fireEvent.change(screen.getByPlaceholderText('Brand name'), { target: { value: 'FlowPro' } });
    fireEvent.change(screen.getByPlaceholderText('Quantity'), { target: { value: '5' } });
    fireEvent.change(screen.getByPlaceholderText('Price'), { target: { value: '55' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Network failed');
  });

  it('blocks invalid product fields before sending them to the API', async () => {
    localStorage.setItem('inventory-user', JSON.stringify({
      id: 'admin-1',
      name: 'Store Admin',
      role: 'admin',
    }));
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Construction' }));
    fireEvent.change(screen.getByPlaceholderText('Product name'), { target: { value: 'Pipe' } });
    fireEvent.change(screen.getByPlaceholderText('Brand name'), { target: { value: 'FlowPro' } });
    fireEvent.change(screen.getByPlaceholderText('Quantity'), { target: { value: '1.5' } });
    fireEvent.change(screen.getByPlaceholderText('Price'), { target: { value: '10.999' } });
    fireEvent.submit(screen.getByPlaceholderText('Product name').closest('form'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Quantity must be a whole number');
    expect(screen.getByRole('alert')).toHaveTextContent('Price must be a non-negative amount');
    expect(apiMocks.createProduct).not.toHaveBeenCalled();
  });

  it('logs out and returns the administrator to the login form', async () => {
    localStorage.setItem('inventory-user', JSON.stringify({
      id: '507f1f77bcf86cd799439011',
      name: 'Store Admin',
      role: 'admin',
    }));
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Logout' }));

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(localStorage.getItem('inventory-user')).toBeNull();
    expect(localStorage.getItem('inventory-token')).toBeNull();
  });
});
