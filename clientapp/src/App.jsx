import { useState } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const initialFormState = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function App() {
  const [screen, setScreen] = useState(() => {
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem('inventory-token') : '';
    return savedToken ? 'home' : 'login';
  });
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

    const endpoint = isLogin ? '/auth/login' : '/auth/signup';
    const payload = isLogin
      ? { email: formData.email, password: formData.password }
      : {
          name: formData.name,
          email: formData.email,
          password: formData.password,
        };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      localStorage.setItem('inventory-token', data.data?.token || '');
      localStorage.setItem('inventory-user', JSON.stringify(data.data?.user || {}));

      setFormData(initialFormState);
      setMessage({ type: 'success', text: isLogin ? 'Welcome back! Login successful.' : 'Account created successfully.' });
      setScreen('home');
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('inventory-token');
    localStorage.removeItem('inventory-user');
    setScreen('login');
    setIsLogin(true);
    setFormData(initialFormState);
    setMessage({ type: '', text: '' });
  };

  if (screen === 'home') {
    return (
      <div className="dashboard-page">
        <div className="page-shell">
          <header className="page-header">
            <div>
              <p className="eyebrow">Dashboard</p>
              <h1>Choose a category</h1>
            </div>
            <button type="button" className="ghost-button" onClick={handleLogout}>
              Logout
            </button>
          </header>

          <div className="category-grid">
            <button type="button" className="category-card construction" onClick={() => setScreen('tmt')}>
              <span className="category-tag">Construction</span>
              <h2>TMT</h2>
              <p>Steel and construction materials for structural work.</p>
              <span className="card-link">Open TMT page</span>
            </button>

            <button type="button" className="category-card hardware" onClick={() => setScreen('pipe')}>
              <span className="category-tag">Hardware</span>
              <h2>Pipe</h2>
              <p>Water, plumbing, and industrial pipe management essentials.</p>
              <span className="card-link">Open Pipe page</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'tmt') {
    return (
      <div className="section-page">
        <div className="page-shell section-shell">
          <header className="page-header">
            <div>
              <p className="eyebrow">Construction</p>
              <h1>TMT Page</h1>
            </div>
            <div className="page-actions">
              <button type="button" className="secondary-button" onClick={() => setScreen('home')}>
                Back to home
              </button>
              <button type="button" className="ghost-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </header>

          <div className="content-panel">
            <h2>Thermo Mechanically Treated Steel</h2>
            <p>
              This section is dedicated to construction-grade TMT materials, including stock tracking,
              quality checks, and procurement updates.
            </p>
            <div className="stats-row">
              <div className="stat-box">
                <strong>1,280</strong>
                <span>Units in stock</span>
              </div>
              <div className="stat-box">
                <strong>92%</strong>
                <span>Utilization</span>
              </div>
              <div className="stat-box">
                <strong>24</strong>
                <span>Orders pending</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'pipe') {
    return (
      <div className="section-page">
        <div className="page-shell section-shell">
          <header className="page-header">
            <div>
              <p className="eyebrow">Hardware</p>
              <h1>Pipe Page</h1>
            </div>
            <div className="page-actions">
              <button type="button" className="secondary-button" onClick={() => setScreen('home')}>
                Back to home
              </button>
              <button type="button" className="ghost-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </header>

          <div className="content-panel">
            <h2>Pipe Inventory</h2>
            <p>
              This section manages hardware pipe inventory, sizes, supply chain records, and delivery
              checkpoints for the warehouse team.
            </p>
            <div className="stats-row">
              <div className="stat-box">
                <strong>940</strong>
                <span>Pipe units</span>
              </div>
              <div className="stat-box">
                <strong>18</strong>
                <span>Categories</span>
              </div>
              <div className="stat-box">
                <strong>7</strong>
                <span>Dispatches today</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <aside className="brand-panel">
          <div className="brand-badge">InventoryPro</div>
          <h1>Smart stock control for modern stores.</h1>
          <p>
            Track products, monitor movement, and keep warehouse operations effortless.
          </p>

          <ul className="feature-list">
            <li>Live inventory insights</li>
            <li>Warehouse ready dashboards</li>
            <li>Secure user access</li>
          </ul>
        </aside>

        <section className="auth-card">
          <div className="auth-toggle" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              className={isLogin ? 'toggle-button active' : 'toggle-button'}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button
              type="button"
              className={!isLogin ? 'toggle-button active' : 'toggle-button'}
              onClick={() => setIsLogin(false)}
            >
              Sign Up
            </button>
          </div>

          <div className="card-header">
            <h2>{isLogin ? 'Welcome back' : 'Create your account'}</h2>
            <p>{isLogin ? 'Access your inventory dashboard' : 'Start managing inventory smarter'}</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <label>
                <span>Full name</span>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  required
                />
              </label>
            )}

            <label>
              <span>Email address</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
              />
            </label>

            {!isLogin && (
              <label>
                <span>Confirm password</span>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  required
                />
              </label>
            )}

            {message.text && (
              <div className={message.type === 'success' ? 'status success' : 'status error'}>
                {message.text}
              </div>
            )}

            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Please wait...' : isLogin ? 'Login' : 'Create account'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default App;
