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
          <div className="brand-badge">BuildMart</div>
          <h1>Everything you need for your next build.</h1>
          <p>Shop trusted construction and hardware products, with live stock and straightforward checkout.</p>
          <ul className="feature-list">
            <li>Browse construction and hardware essentials</li>
            <li>Stock-aware cart and order checkout</li>
            <li>Order invoices saved to your account</li>
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
            <p>{isLogin ? 'Sign in to shop and view your orders' : 'Create an account to start shopping'}</p>
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
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
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
                maxLength={254}
                autoComplete="email"
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
                minLength={8}
                maxLength={72}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
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
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                  />
                </label>

              </>
            )}

            {message.text && (
              <div
                className={message.type === 'success' ? 'status success' : 'status error'}
                role={message.type === 'success' ? 'status' : 'alert'}
              >
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
