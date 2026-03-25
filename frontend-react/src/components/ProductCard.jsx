export default function ProductCard({ product, onAddToCart }) {
  const image = product.image || `https://via.placeholder.com/400x300?text=${encodeURIComponent(product.name)}`
  return (
    <div className="group flex flex-col bg-white rounded-2xl border border-stone-200/60 overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300">
      <div className="aspect-[4/3] bg-stone-50 overflow-hidden relative">
        <img
          src={image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
        />
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-medium text-stone-900 text-lg leading-snug">{product.name}</h3>
        <p className="mt-1 text-lg font-semibold text-stone-600">
          ₹{product.price?.toLocaleString()}
        </p>
        <div className="mt-auto pt-4">
          <button
            onClick={() => onAddToCart(product)}
            className="w-full py-2.5 rounded-xl bg-stone-100 text-stone-900 font-medium hover:bg-stone-200 transition-colors"
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  )
}
