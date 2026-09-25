export default function CategoryList({ categories = [] }) {
  return (
    <div className="category-list">
      {categories.map((category) => (
        <button key={category.id} type="button" className="category-list__item">
          <span>{category.name}</span>
        </button>
      ))}
    </div>
  );
}
