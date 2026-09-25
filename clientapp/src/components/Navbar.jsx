export default function Navbar({ userName = 'Inventory Admin' }) {
  return (
    <header className="navbar">
      <div className="navbar__brand">InventoryPro</div>
      <nav className="navbar__nav">
        <a href="/">Home</a>
        <a href="/cart">Cart</a>
        <a href="/invoice">Invoice</a>
      </nav>
      <span className="navbar__user">{userName}</span>
    </header>
  );
}
