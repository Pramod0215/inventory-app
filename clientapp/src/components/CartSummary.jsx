export default function CartSummary({ items = [], total = 0 }) {
  return (
    <aside className="cart-summary">
      <h3>Cart Summary</h3>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.name}</span>
            <span>{item.quantity}</span>
          </li>
        ))}
      </ul>
      <div className="cart-summary__total">
        <span>Total</span>
        <strong>₹{total}</strong>
      </div>
    </aside>
  );
}
