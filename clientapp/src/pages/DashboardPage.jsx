export function DashboardPage({ userName, onLogout, onOpenCategory, stockData = [] }) {
  const chartData = [42, 58, 72, 63, 86, 94, 81];

  return (
    <div className="dashboard-page">
      <div className="page-shell admin-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">Admin Dashboard</p>
            <h1>Welcome {userName}</h1>
          </div>
          <div className="page-actions">
            <button type="button" className="secondary-button" onClick={() => onOpenCategory('construction')}>
              Construction
            </button>
            <button type="button" className="secondary-button" onClick={() => onOpenCategory('hardware')}>
              Hardware
            </button>
            <button type="button" className="ghost-button" onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="analytics-panel">
          <div className="analytics-header">
            <div>
              <p className="eyebrow">Overview</p>
              <h2>Sales & inventory trend</h2>
            </div>
            <div className="metric-badges">
              <span>Total stock: 1,240</span>
              <span>Revenue: ₹8.5L</span>
            </div>
          </div>

          <div className="chart-bars" aria-label="Sales and stock trends">
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
            <h3>Stock table</h3>
            <span>Category, product, quantity, and price</span>
          </div>
          <table className="stock-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stockData.map((row, index) => (
                <tr key={`${row.category}-${row.product}-${index}`}>
                  <td>{row.category}</td>
                  <td>{row.product}</td>
                  <td>{row.quantity}</td>
                  <td>₹{row.price}</td>
                  <td><span className={row.status === 'Available' ? 'status-pill available' : 'status-pill low'}>{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
