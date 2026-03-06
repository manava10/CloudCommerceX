export default function ProductCard({ product, onAddToCart }) {
  const image = product.image || `https://via.placeholder.com/400x300?text=${encodeURIComponent(product.name)}`
  return (
    <div className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg hover:shadow-stone-200/50 transition-all duration-300">
      <div className="aspect-[4/3] overflow-hidden bg-stone-100">
        <img
          src={image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-6">
        <h3 className="font-semibold text-stone-900 text-lg">{product.name}</h3>
        <p className="mt-2 text-xl font-bold text-stone-900">₹{product.price?.toLocaleString()}</p>
        <button
          onClick={() => onAddToCart(product)}
          className="mt-4 w-full py-2.5 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-800 transition"
        >
          Add to cart
        </button>
      </div>
    </div>
  )
}
