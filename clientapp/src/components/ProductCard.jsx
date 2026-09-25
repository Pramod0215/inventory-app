export default function ProductCard({ product }) {
  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />
      <div className="product-card__body">
        <h3>{product.name}</h3>
        <p>{product.brand}</p>
        <div className="product-card__meta">
          <span>Qty: {product.quantity}</span>
          <strong>₹{product.price}</strong>
        </div>
      </div>
    </div>
  );
}
