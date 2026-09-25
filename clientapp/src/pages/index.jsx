import CategoryList from '../components/CategoryList';
import ProductCard from '../components/ProductCard';

const demoProducts = [
  {
    id: 1,
    name: 'TMT Steel Rod 12mm',
    brand: 'SteelMax',
    quantity: 48,
    price: 190,
    image: 'https://images.unsplash.com/photo-1581092921461-eab62e97a4f1?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 2,
    name: 'PVC Pipe 2 inch',
    brand: 'FlowPro',
    quantity: 60,
    price: 120,
    image: 'https://images.unsplash.com/photo-1581092335399-7f0dfb056f9c?auto=format&fit=crop&w=900&q=80',
  },
];

const demoCategories = [
  { id: 'tmt', name: 'TMT' },
  { id: 'pipe', name: 'Pipe' },
];

export default function CatalogPage() {
  return (
    <main className="catalog-page">
      <CategoryList categories={demoCategories} />
      <div className="catalog-grid">
        {demoProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </main>
  );
}
