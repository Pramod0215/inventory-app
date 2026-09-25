export function AuthForm({
  isLogin,
  formData,
  loading,
  message,
  onChange,
  onSubmit,
  onToggleMode,
}) {
  return (
    <div className="auth-page">
      <div className="auth-shell">
        <aside className="brand-panel">
          <div className="brand-badge">InventoryPro</div>
          <h1>Smart stock control for modern stores.</h1>
          <p>Track products, monitor movement, and keep warehouse operations effortless.</p>
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
              onClick={() => onToggleMode(true)}
            >
              Login
            </button>
            <button
              type="button"
              className={!isLogin ? 'toggle-button active' : 'toggle-button'}
              onClick={() => onToggleMode(false)}
            >
              Sign Up
            </button>
          </div>

          <div className="card-header">
            <h2>{isLogin ? 'Welcome back' : 'Create your account'}</h2>
            <p>{isLogin ? 'Access your inventory dashboard' : 'Start managing inventory smarter'}</p>
          </div>

          <form onSubmit={onSubmit} className="auth-form">
            {!isLogin && (
              <label>
                <span>Full name</span>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={onChange}
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
                onChange={onChange}
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
                onChange={onChange}
                placeholder="Enter your password"
                required
              />
            </label>

            {!isLogin && (
              <>
                <label>
                  <span>Confirm password</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={onChange}
                    placeholder="Re-enter your password"
                    required
                  />
                </label>

                <label>
                  <span>Role</span>
                  <select name="role" value={formData.role || 'user'} onChange={onChange}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
              </>
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
