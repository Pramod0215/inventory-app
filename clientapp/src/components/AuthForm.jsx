import PreferencesControls from './PreferencesControls.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';

export function AuthForm({
  isLogin,
  formData,
  loading,
  message,
  onChange,
  onSubmit,
  onToggleMode,
}) {
  const { t } = useI18n();

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-preferences"><PreferencesControls /></div>
        <aside className="brand-panel">
          <div className="brand-badge">InventoryPro</div>
          <h1>{t('Everything you need for your next build.')}</h1>
          <p>{t('Shop trusted construction and hardware products, with live stock and straightforward checkout.')}</p>
          <ul className="feature-list">
            <li>{t('Browse construction and hardware essentials')}</li>
            <li>{t('Stock-aware cart and order checkout')}</li>
            <li>{t('Order invoices saved to your account')}</li>
          </ul>
        </aside>

        <section className="auth-card">
          <div className="auth-toggle" role="tablist" aria-label={t('Authentication mode')}>
            <button
              type="button"
              className={isLogin ? 'toggle-button active' : 'toggle-button'}
              onClick={() => onToggleMode(true)}
            >
              {t('Login')}
            </button>
            <button
              type="button"
              className={!isLogin ? 'toggle-button active' : 'toggle-button'}
              onClick={() => onToggleMode(false)}
            >
              {t('Sign Up')}
            </button>
          </div>

          <div className="card-header">
            <h2>{t(isLogin ? 'Welcome back' : 'Create your account')}</h2>
            <p>{t(isLogin ? 'Sign in to shop and view your orders' : 'Create an account to start shopping')}</p>
          </div>

          <form onSubmit={onSubmit} className="auth-form">
            {!isLogin && (
              <label>
                <span>{t('Full name')}</span>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={onChange}
                  placeholder={t('Enter your name')}
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                />
              </label>
            )}

            <label>
              <span>{t('Email address')}</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={onChange}
                placeholder={t('Enter your email')}
                required
                maxLength={254}
                autoComplete="email"
              />
            </label>

            <label>
              <span>{t('Password')}</span>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={onChange}
                placeholder={t('Enter your password')}
                required
                minLength={8}
                maxLength={72}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </label>

            {!isLogin && (
              <>
                <label>
                  <span>{t('Confirm password')}</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={onChange}
                    placeholder={t('Re-enter your password')}
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
                {t(message.text)}
              </div>
            )}

            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? t('Please wait...') : t(isLogin ? 'Login' : 'Create account')}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
