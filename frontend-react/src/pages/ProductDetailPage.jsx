import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function ProductDetailPage({ products, productsLoading, onAddToCart, cart, user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  
  // Try to find product from props first (fast path)
  const propProduct = products.find(p => p.id === id)
  
  const [product, setProduct] = useState(propProduct || null)
  const [loading, setLoading] = useState(!propProduct && productsLoading)
  const [error, setError] = useState(null)
  const [addingToCart, setAddingToCart] = useState(false)

  // Fetch product directly if not in props (e.g. direct link navigation)
  useEffect(() => {
    if (propProduct) {
      setProduct(propProduct)
      return
    }
    
    setLoading(true)
    api(`/catalog/products/${id}`)
      .then(p => {
        setProduct(p)
        setError(null)
      })
      .catch(err => {
        console.error("Failed to fetch product:", err)
        setError("Product not found or unavailable.")
      })
      .finally(() => setLoading(false))
  }, [id, propProduct])

  const handleAddToCart = async () => {
    if (!product) return
    setAddingToCart(true)
    await onAddToCart(product)
    setAddingToCart(false)
  }

  // Check if product is already in cart
  const cartItem = cart?.find(item => item.productId === product?.id)
  const qtyInCart = cartItem?.qty || 0

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 animate-pulse">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          <div className="w-full md:w-1/2 aspect-square bg-stone-200 rounded-2xl"></div>
          <div className="w-full md:w-1/2 space-y-6 pt-4">
            <div className="h-6 w-24 bg-stone-200 rounded-full"></div>
            <div className="h-10 w-3/4 bg-stone-200 rounded"></div>
            <div className="h-8 w-32 bg-stone-200 rounded"></div>
            <div className="space-y-3 pt-6 border-t border-stone-100">
              <div className="h-4 w-full bg-stone-200 rounded"></div>
              <div className="h-4 w-5/6 bg-stone-200 rounded"></div>
              <div className="h-4 w-4/6 bg-stone-200 rounded"></div>
            </div>
            <div className="pt-8 h-14 w-full bg-stone-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold text-stone-900 mb-4">{error || "Product not found"}</h2>
        <p className="text-stone-500 mb-8">The product you're looking for doesn't exist or is no longer available.</p>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-stone-900 text-white font-medium rounded-xl hover:bg-stone-800 transition"
        >
          Return to Shop
        </button>
      </div>
    )
  }

  const isOutOfStock = product.stock <= 0
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-stone-500 mb-8">
        <Link to="/" className="hover:text-stone-900 transition">Home</Link>
        <span>/</span>
        {product.category && (
          <>
            <span className="cursor-default">{product.category}</span>
            <span>/</span>
          </>
        )}
        <span className="text-stone-900 font-medium truncate max-w-[200px] sm:max-w-none">{product.name}</span>
      </nav>

      <div className="flex flex-col md:flex-row gap-8 lg:gap-16">
        {/* Product Image */}
        <div className="w-full md:w-1/2">
          <div className="bg-white rounded-2xl border border-stone-200 aspect-square flex items-center justify-center p-8 lg:p-12 shadow-sm overflow-hidden sticky top-24">
            {product.image ? (
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <svg className="w-24 h-24 text-stone-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
        </div>

        {/* Product Info */}
        <div className="w-full md:w-1/2 flex flex-col">
          {product.category && (
            <span className="inline-block px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-semibold tracking-wider uppercase mb-4 self-start">
              {product.category}
            </span>
          )}
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-900 mb-4 leading-tight">
            {product.name}
          </h1>
          
          <div className="flex items-end gap-4 mb-6 pb-6 border-b border-stone-100">
            <span className="text-3xl font-bold text-stone-900">
              ₹{(product.price / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Description */}
          <div className="mb-8 prose prose-stone">
            <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-3">Description</h3>
            <p className="text-stone-600 leading-relaxed whitespace-pre-line">
              {product.description || "No description provided for this product."}
            </p>
          </div>

          {/* Seller Info */}
          {product.sellerId && (
            <div className="mb-8 p-4 bg-stone-50 rounded-xl border border-stone-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-bold">
                {product.sellerId.substring(1, 3).toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-stone-500 font-medium">Sold by</p>
                <p className="text-sm font-semibold text-stone-900">{product.sellerId}</p>
              </div>
            </div>
          )}

          {/* Add to Cart Actions */}
          <div className="mt-auto pt-8 border-t border-stone-100">
            <div className="flex items-center justify-between mb-4">
              <span className={`text-sm font-medium flex items-center gap-1.5 ${isOutOfStock ? 'text-red-600' : product.stock < 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                <span className={`w-2 h-2 rounded-full ${isOutOfStock ? 'bg-red-600' : product.stock < 5 ? 'bg-amber-600' : 'bg-emerald-600'}`}></span>
                {isOutOfStock ? 'Out of Stock' : `${product.stock} in stock`}
              </span>
              
              {qtyInCart > 0 && (
                <span className="text-sm text-stone-500 font-medium">
                  {qtyInCart} already in cart
                </span>
              )}
            </div>

            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock || addingToCart || (product.sellerId === user?.id)}
              className={`w-full py-4 px-6 rounded-xl font-medium text-lg flex items-center justify-center gap-2 transition-all ${
                isOutOfStock || (product.sellerId === user?.id)
                  ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                  : 'bg-stone-900 text-white hover:bg-stone-800 active:scale-[0.98]'
              }`}
            >
              {addingToCart ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : isOutOfStock ? (
                'Sold Out'
              ) : product.sellerId === user?.id ? (
                'You own this product'
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Add to Cart
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
