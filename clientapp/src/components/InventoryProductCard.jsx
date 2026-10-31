import { memo } from 'react';

function InventoryProductCard({ product, t, isAdmin = false, onAdd, onEdit, onDelete }) {
  return (
    <article className="product-card">
      <img src={product.image} alt={product.name} className="product-image" loading="lazy" decoding="async" />
      <div className="product-body">
        <div className="product-header-row">
          <div>
            <h3>{product.name}</h3>
            <p className="brand-name">{product.brand}</p>
          </div>
          <div className="rating-box">★ {product.rating}</div>
        </div>
        <div className="product-meta-line">
          <span>{t('Qty')}: {product.quantity}</span>
          <strong>₹{product.price}</strong>
        </div>
        {isAdmin ? (
          <div className="admin-actions">
            <button type="button" className="secondary-button small" onClick={() => onEdit(product)}>
              {t('Edit')}
            </button>
            <button type="button" className="ghost-button small" onClick={() => onDelete(product.id)}>
              {t('Delete')}
            </button>
          </div>
        ) : (
          <button type="button" className="primary-button small" onClick={() => onAdd(product)}>
            {t('Add to cart')}
          </button>
        )}
      </div>
    </article>
  );
}

export default memo(InventoryProductCard);
