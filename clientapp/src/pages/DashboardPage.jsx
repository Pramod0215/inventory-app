import { memo } from 'react';
import AppHeader from '../components/AppHeader.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';

export const DashboardPage = memo(function DashboardPage({ userName, onLogout, onOpenCategory, onSettings, onProfile, onFeedback, stockData = [] }) {
  const { t } = useI18n();
  const chartData = [42, 58, 72, 63, 86, 94, 81];

  return (
    <div className="dashboard-page">
      <div className="page-shell admin-shell">
        <AppHeader userName={userName} onSettings={onSettings} onProfile={onProfile} onLogout={onLogout} onFeedback={onFeedback} />
        <header className="page-header">
          <div>
            <p className="eyebrow">{t('Admin Dashboard')}</p>
            <h1>{t('Welcome')} {userName}</h1>
          </div>
          <div className="page-actions">
            <button type="button" className="secondary-button" onClick={() => onOpenCategory('construction')}>
              {t('Construction')}
            </button>
            <button type="button" className="secondary-button" onClick={() => onOpenCategory('hardware')}>
              {t('Hardware')}
            </button>
          </div>
        </header>

        <section className="analytics-panel">
          <div className="analytics-header">
            <div>
              <p className="eyebrow">{t('Overview')}</p>
              <h2>{t('Sales & inventory trend')}</h2>
            </div>
            <div className="metric-badges">
              <span>{t('Total stock: 1,240')}</span>
              <span>{t('Revenue: ₹8.5L')}</span>
            </div>
          </div>

          <div className="chart-bars" aria-label={t('Sales & inventory trend')}>
            {chartData.map((value, index) => (
              <div key={index} className="chart-bar-group">
                <span className="chart-bar" style={{ height: `${value}%` }} />
                <small>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'][index]}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="stock-panel">
          <div className="section-title-row">
            <h3>{t('Stock table')}</h3>
            <span>{t('Category, product, quantity, and price')}</span>
          </div>
          <table className="stock-table">
            <thead>
              <tr>
                <th>{t('Category')}</th>
                <th>{t('Product')}</th>
                <th>{t('Quantity')}</th>
                <th>{t('Price')}</th>
                <th>{t('Status')}</th>
              </tr>
            </thead>
            <tbody>
              {stockData.map((row, index) => (
                <tr key={`${row.category}-${row.product}-${index}`}>
                  <td>{t(row.category)}</td>
                  <td>{row.product}</td>
                  <td>{row.quantity}</td>
                  <td>₹{row.price}</td>
                  <td><span className={row.status === 'Available' ? 'status-pill available' : 'status-pill low'}>{t(row.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
});
