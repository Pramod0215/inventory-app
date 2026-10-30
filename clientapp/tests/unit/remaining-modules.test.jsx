import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../src/setupTests.js';
import LegacyApp from '../../src/App.jsx';
import AdminLayout from '../../src/layouts/AdminLayout.jsx';
import AuthLayout from '../../src/layouts/AuthLayout.jsx';
import UserLayout from '../../src/layouts/UserLayout.jsx';
import CategoriesPage from '../../src/pages/admin/categories.jsx';
import AdminDashboardPage from '../../src/pages/admin/dashboard.jsx';
import CatalogPage from '../../src/pages/index.jsx';
import LoginPage from '../../src/pages/login.jsx';
import SignupPage from '../../src/pages/signup.jsx';
import UserCartPage from '../../src/pages/user/cart.jsx';
import UserInvoicePage from '../../src/pages/user/invoice.jsx';
import CartSummary from '../../src/components/CartSummary.jsx';
import CategoryList from '../../src/components/CategoryList.jsx';
import Footer from '../../src/components/Footer.jsx';
import InvoiceTable from '../../src/components/InvoiceTable.jsx';
import Navbar from '../../src/components/Navbar.jsx';
import { useAuth } from '../../src/hooks/useAuth.js';
import { useCart } from '../../src/hooks/useCart.js';
import { useInvoice } from '../../src/hooks/useInvoice.js';
import { useProducts } from '../../src/hooks/useProducts.js';
import { authSlice } from '../../src/store/authSlice.js';
import { cartSlice } from '../../src/store/cartSlice.js';
import { categorySlice } from '../../src/store/categorySlice.js';
import { productSlice } from '../../src/store/productSlice.js';
import { DashboardPage } from '../../src/pages/DashboardPage.jsx';
import { APP_NAME, USER_ROLES } from '../../src/utils/constants.js';
import { inventoryData } from '../../src/data/inventoryData.js';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn());
});

describe('shared components', () => {
  it('renders cart lines and totals', () => {
    render(<CartSummary items={[{ id: 'p1', name: 'Steel rod', quantity: 2 }]} total={380} />);

    expect(screen.getByRole('heading', { name: 'Cart Summary' })).toBeInTheDocument();
    expect(screen.getByText('Steel rod')).toBeInTheDocument();
    expect(screen.getByText('₹380')).toBeInTheDocument();
  });

  it('renders categories and safely handles an empty category list', () => {
    const { rerender } = render(<CategoryList categories={[
      { id: 'tmt', name: 'TMT' },
      { id: 'pipe', name: 'Pipe' },
    ]} />);

    expect(screen.getByRole('button', { name: 'TMT' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pipe' })).toBeInTheDocument();

    rerender(<CategoryList />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a dated footer', () => {
    render(<Footer />);

    expect(screen.getByText(new RegExp(String(new Date().getFullYear())))).toBeInTheDocument();
  });

  it('renders invoice rows and calculates line totals', () => {
    render(<InvoiceTable rows={[{ id: 'p1', name: 'Pipe', quantity: 3, price: 25 }]} />);

    expect(screen.getByRole('columnheader', { name: 'Total' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '₹75' })).toBeInTheDocument();
  });

  it('renders navigation links and supports a custom user name', () => {
    render(<Navbar userName="Sam" />);

    expect(screen.getByText('InventoryPro')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cart' })).toHaveAttribute('href', '/cart');
    expect(screen.getByText('Sam')).toBeInTheDocument();
  });
});

describe('layouts and simple pages', () => {
  it.each([
    ['AdminLayout', AdminLayout, 'admin-layout'],
    ['AuthLayout', AuthLayout, 'auth-layout'],
    ['UserLayout', UserLayout, 'user-layout'],
  ])('renders children in the %s container', (_name, Layout, className) => {
    const { container } = render(<Layout><span>Child content</span></Layout>);

    expect(container.querySelector(`.${className}`)).toHaveTextContent('Child content');
  });

  it.each([
    ['categories', CategoriesPage, 'Categories'],
    ['admin dashboard', AdminDashboardPage, 'Admin Dashboard'],
    ['login', LoginPage, 'Login'],
    ['signup', SignupPage, 'Sign Up'],
    ['cart', UserCartPage, 'Cart'],
    ['invoice', UserInvoicePage, 'Invoice'],
  ])('renders the %s page', (_name, Page, heading) => {
    render(<Page />);

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('renders catalog categories and demo products', () => {
    render(<CatalogPage />);

    expect(screen.getByRole('button', { name: 'TMT' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'TMT Steel Rod 12mm' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'PVC Pipe 2 inch' })).toBeInTheDocument();
  });

});

describe('hooks, store defaults, and constants', () => {
  it('returns the documented initial values from each hook', () => {
    expect(useAuth()).toEqual({ isAuthenticated: false, user: null });
    expect(useCart()).toEqual({ items: [], total: 0 });
    expect(useInvoice()).toEqual({ invoice: null });
    expect(useProducts()).toEqual({ products: [] });
  });

  it('exports correctly shaped initial store slices', () => {
    expect(authSlice).toEqual({ name: 'auth', state: { user: null, token: null } });
    expect(cartSlice).toEqual({ name: 'cart', state: { items: [] } });
    expect(categorySlice).toEqual({ name: 'category', state: { categories: [] } });
    expect(productSlice).toEqual({ name: 'product', state: { products: [] } });
  });

  it('exports roles, application name, and catalog data', () => {
    expect(APP_NAME).toBe('InventoryPro');
    expect(USER_ROLES).toEqual({ USER: 'user', ADMIN: 'admin' });
    expect(inventoryData.tmt).toHaveLength(2);
    expect(inventoryData.pipe[0]).toMatchObject({ name: 'PVC Pipe 2 inch', price: 120 });
  });
});

describe('legacy authentication and category app', () => {
  it('validates matching passwords before sending a registration request', async () => {
    render(<LegacyApp />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Sam' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'sam@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret12' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('logs in, navigates to category pages, and clears the saved session on logout', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { token: 'token-1', user: { name: 'Sam' } } }),
    });
    render(<LegacyApp />);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'sam@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret12' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Login' }).at(-1));

    expect(await screen.findByRole('heading', { name: 'Choose a category' })).toBeInTheDocument();
    expect(localStorage.getItem('inventory-token')).toBe('token-1');
    fireEvent.click(screen.getByRole('button', { name: /Open TMT page/ }));
    expect(screen.getByRole('heading', { name: 'TMT Page' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to home' }));
    fireEvent.click(screen.getByRole('button', { name: /Open Pipe page/ }));
    expect(screen.getByRole('heading', { name: 'Pipe Page' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(localStorage.getItem('inventory-token')).toBeNull();
  });

  it('shows authentication API errors without persisting a session', async () => {
    fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Invalid credentials' }),
    });
    render(<LegacyApp />);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'sam@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Login' }).at(-1));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(localStorage.getItem('inventory-token')).toBeNull();
  });

  it('opens the home dashboard for a previously saved token', () => {
    localStorage.setItem('inventory-token', 'existing-token');
    render(<LegacyApp />);

    expect(screen.getByRole('heading', { name: 'Choose a category' })).toBeInTheDocument();
  });
});

describe('entrypoint and performance helper', () => {
  it('does not load performance metrics when no callback is supplied', async () => {
    const { default: reportWebVitals } = await import('../../src/reportWebVitals.js');

    expect(() => reportWebVitals()).not.toThrow();
    expect(() => reportWebVitals('not a function')).not.toThrow();
  });

  it('registers each Web Vitals metric for a callback', async () => {
    vi.resetModules();
    const metric = vi.fn();
    const vitals = {
      getCLS: vi.fn((callback) => callback({ name: 'CLS' })),
      getFID: vi.fn((callback) => callback({ name: 'FID' })),
      getFCP: vi.fn((callback) => callback({ name: 'FCP' })),
      getLCP: vi.fn((callback) => callback({ name: 'LCP' })),
      getTTFB: vi.fn((callback) => callback({ name: 'TTFB' })),
    };
    vi.doMock('web-vitals', () => vitals);

    const { default: reportWebVitals } = await import('../../src/reportWebVitals.js');
    reportWebVitals(metric);
    await vi.waitFor(() => expect(metric).toHaveBeenCalledTimes(5));

    expect(vitals.getCLS).toHaveBeenCalledWith(metric);
    expect(vitals.getFID).toHaveBeenCalledWith(metric);
    expect(vitals.getFCP).toHaveBeenCalledWith(metric);
    expect(vitals.getLCP).toHaveBeenCalledWith(metric);
    expect(vitals.getTTFB).toHaveBeenCalledWith(metric);
  });

  it('mounts the active storefront in React strict mode', async () => {
    vi.resetModules();
    const renderRoot = vi.fn();
    const createRoot = vi.fn(() => ({ render: renderRoot }));
    vi.doMock('react-dom/client', () => ({ default: { createRoot }, createRoot }));
    document.body.innerHTML = '<div id="root"></div>';
    await import('../../src/main.jsx');

    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(renderRoot).toHaveBeenCalledOnce();
    expect(renderRoot.mock.calls[0][0].type).toBe(React.StrictMode);
  });

  it('mounts the legacy entry and invokes its performance reporter', async () => {
    vi.resetModules();
    const renderRoot = vi.fn();
    const createRoot = vi.fn(() => ({ render: renderRoot }));
    const reportWebVitals = vi.fn();
    vi.doMock('react-dom/client', () => ({ default: { createRoot }, createRoot }));
    vi.doMock('../../src/App.js', () => ({ default: () => <div>Legacy application</div> }));
    vi.doMock('../../src/reportWebVitals.js', () => ({
      default: reportWebVitals,
    }));
    document.body.innerHTML = '<div id="root"></div>';
    await import('../../src/index.js');

    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(renderRoot).toHaveBeenCalledOnce();
    expect(renderRoot.mock.calls[0][0].type).toBe(React.StrictMode);
    expect(reportWebVitals).toHaveBeenCalledWith();
  });

  it('installs the Testing Library DOM matchers from the project test setup', () => {
    render(<div>Matcher setup</div>);

    expect(screen.getByText('Matcher setup')).toBeInTheDocument();
  });

  it('renders available and out-of-stock rows and connects dashboard actions', () => {
    const onLogout = vi.fn();
    const onOpenCategory = vi.fn();
    render(
      <DashboardPage
        userName="Admin"
        onLogout={onLogout}
        onOpenCategory={onOpenCategory}
        stockData={[
          { category: 'Hardware', product: 'Pipe', quantity: 3, price: 25, status: 'Available' },
          { category: 'Construction', product: 'Steel', quantity: 0, price: 10, status: 'Out of stock' },
        ]}
      />
    );

    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Construction' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hardware' }));
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(onOpenCategory).toHaveBeenNthCalledWith(1, 'construction');
    expect(onOpenCategory).toHaveBeenNthCalledWith(2, 'hardware');
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
