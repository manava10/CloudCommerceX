import { Link } from 'react-router-dom'

export default function CartDrawer({ open, onClose, cart, cartLoading, products, user, onRemove, onLogin }) {
  const getProduct = (id) => products.find((p) => p.id === id)
  const total = cart.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <h2 className="text-xl font-semibold text-stone-900">Cart</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-stone-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {cartLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 items-center animate-pulse">
                  <div className="w-16 h-16 rounded-lg bg-stone-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-stone-200 rounded w-3/4" />
                    <div className="h-3 bg-stone-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : cart.length === 0 ? (
            <p className="text-stone-500">Your cart is empty.</p>
          ) : (
            <ul className="space-y-4">
              {cart.map((item) => {
                const p = getProduct(item.productId)
                return (
                  <li key={item.productId} className="flex gap-4 items-center border-b border-stone-100 pb-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                      {p?.image && (
                        <img src={p.image} alt={p?.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-900 truncate">{p?.name || item.productId}</p>
                      <p className="text-sm text-stone-600">{item.qty} × ₹{item.price?.toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => onRemove(item.productId)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="p-6 border-t border-stone-200">
          <div className="flex justify-between text-lg font-semibold text-stone-900 mb-4">
            <span>Total</span>
            <span>₹{total.toLocaleString()}</span>
          </div>
          {user ? (
            <Link
              to="/checkout"
              onClick={onClose}
              className="block w-full py-3 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-800 disabled:opacity-50 transition text-center"
            >
              Proceed to Checkout
            </Link>
          ) : (
            <button
              onClick={onLogin}
              className="w-full py-3 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-800 transition"
            >
              Sign in to checkout
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
