import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'

export default function OrderConfirmationPage({ user, products }) {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderId || !user) return
    api(`/order/orders?userId=${encodeURIComponent(user.id)}`)
      .then((orders) => {
        const o = orders.find((x) => x.id === orderId)
        setOrder(o || null)
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false))
  }, [orderId, user])

  const getProduct = (id) => products.find((p) => p.id === id)

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-stone-500">Loading...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-stone-600 mb-4">Order not found.</p>
        <Link to="/" className="text-stone-900 font-medium hover:underline">Back to shop</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="bg-green-50 border-b border-green-100 p-8 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mb-2">Order Placed!</h1>
          <p className="text-stone-600">Thank you for your purchase.</p>
        </div>
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <span className="font-semibold text-stone-900">Order #{order.id}</span>
            <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 font-medium">{order.status}</span>
          </div>
          <ul className="space-y-3 mb-6">
            {order.items?.map((item) => (
              <li key={item.productId} className="flex justify-between">
                <span>{getProduct(item.productId)?.name || item.productId} × {item.qty || 1}</span>
                <span>₹{((item.price || 0) * (item.qty || 1)).toLocaleString()}</span>
              </li>
            ))}
          </ul>
          <div className="pt-4 border-t border-stone-100 flex justify-between font-semibold text-lg text-stone-900">
            <span>Total</span>
            <span>₹{order.total?.toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div className="mt-8 flex gap-4 justify-center">
        <Link
          to="/orders"
          className="px-6 py-3 rounded-xl border border-stone-300 text-stone-700 font-medium hover:bg-stone-50"
        >
          View all orders
        </Link>
        <Link
          to="/"
          className="px-6 py-3 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-800"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  )
}
