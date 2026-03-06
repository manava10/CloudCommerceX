import ProductCard from './ProductCard'

export default function ProductGrid({ products, loading, onAddToCart }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-stone-200 overflow-hidden animate-pulse">
            <div className="aspect-[4/3] bg-stone-200" />
            <div className="p-6 space-y-3">
              <div className="h-5 bg-stone-200 rounded w-3/4" />
              <div className="h-6 bg-stone-200 rounded w-1/4" />
              <div className="h-10 bg-stone-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
      ))}
    </div>
  )
}
