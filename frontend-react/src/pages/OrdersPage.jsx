import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

export default function OrdersPage({ user, products }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    api(`/order/orders?userId=${encodeURIComponent(user.id)}`)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [user])

  const getProduct = (id) => products.find((p) => p.id === id)

  const statusColor = (status) => {
    if (status === 'PAID') return 'bg-green-100 text-green-800'
    if (status === 'CREATED') return 'bg-amber-100 text-amber-800'
    return 'bg-stone-100 text-stone-800'
  }

  const formatDate = (d) => {
    if (!d) return '-'
    const date = new Date(d)
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link to="/" className="text-stone-600 hover:text-stone-900 text-sm mb-6 inline-block">
        ← Back to Shop
      </Link>
      <h1 className="text-3xl font-bold text-stone-900 mb-2">Recent Orders</h1>
      <p className="text-stone-600 mb-8">Your order history</p>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-200 overflow-hidden animate-pulse">
              <div className="p-6 border-b border-stone-100 flex justify-between">
                <div className="h-5 bg-stone-200 rounded w-32" />
                <div className="h-6 bg-stone-200 rounded w-16" />
              </div>
              <div className="p-6 space-y-3">
                <div className="h-4 bg-stone-200 rounded w-full" />
                <div className="h-4 bg-stone-200 rounded w-4/5" />
                <div className="h-6 bg-stone-200 rounded w-24 mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <p className="text-stone-600 mb-4">No orders yet.</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <ul className="space-y-6">
          {orders.map((order) => (
            <li key={order.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="p-6 border-b border-stone-100 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="font-semibold text-stone-900">Order #{order.id}</span>
                  <span className="ml-3 text-sm text-stone-500">{formatDate(order.createdAt)}</span>
                </div>
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
              <div className="p-6">
                <ul className="space-y-3 mb-4">
                  {order.items?.map((item) => (
                    <li key={item.productId} className="flex justify-between text-stone-700">
                      <span>
                        {getProduct(item.productId)?.name || item.productId} × {item.qty || 1}
                      </span>
                      <span>₹{((item.price || 0) * (item.qty || 1)).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-4 border-t border-stone-100 flex justify-between font-semibold text-stone-900 text-lg">
                  <span>Total</span>
                  <span>₹{order.total?.toLocaleString()}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
