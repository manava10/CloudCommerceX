import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'

const statusOptions = ['CREATED', 'PAID', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']

const statusColor = (status) => {
  if (status === 'PAID') return 'bg-green-100 text-green-800'
  if (status === 'CREATED') return 'bg-amber-100 text-amber-800'
  if (status === 'PROCESSING') return 'bg-blue-100 text-blue-800'
  if (status === 'SHIPPED') return 'bg-indigo-100 text-indigo-800'
  if (status === 'OUT_FOR_DELIVERY') return 'bg-orange-100 text-orange-800'
  if (status === 'DELIVERED') return 'bg-emerald-100 text-emerald-800'
  if (status === 'CANCELLED') return 'bg-red-100 text-red-800'
  return 'bg-stone-100 text-stone-800'
}

export default function SellerOrdersPage({ user }) {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api(`/order/orders?sellerId=${user.id}`)
      setOrders(data)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await api(`/order/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      })
      toast(`Order status updated to ${newStatus}`, 'success')
      fetchOrders()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const filteredOrders = filter === 'ALL' ? orders : orders.filter((o) => o.status === filter)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-stone-500">
        <div className="w-8 h-8 border-3 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
        <p>Loading orders...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-3xl font-bold text-stone-900">Incoming Orders</h2>
        <span className="text-sm text-stone-500 bg-stone-100 px-3 py-1 rounded-full font-medium">
          {orders.length} orders
        </span>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === 'ALL'
              ? 'bg-stone-900 text-white'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
          onClick={() => setFilter('ALL')}
        >
          All ({orders.length})
        </button>
        {statusOptions.map((s) => {
          const count = orders.filter((o) => o.status === s).length
          if (count === 0) return null
          return (
            <button
              key={s}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === s
                  ? 'bg-stone-900 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
              onClick={() => setFilter(s)}
            >
              {s} ({count})
            </button>
          )
        })}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <p className="text-3xl mb-3">📋</p>
          <h3 className="font-semibold text-stone-900 mb-1">No orders found</h3>
          <p className="text-stone-600">
            {filter === 'ALL' ? "You haven't received any orders yet." : `No orders with status "${filter}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300">
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold text-stone-900">Order #{order.id}</span>
                  <span className="text-sm text-stone-500">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>

              <div className="px-6 py-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-1.5 text-sm text-stone-600">
                    <span>{item.productId}</span>
                    <div className="flex gap-6">
                      <span>×{item.qty}</span>
                      <span className="text-stone-900 font-medium">₹{((item.price * item.qty) / 100).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>

              {order.shippingAddress && (
                <div className="px-6 pb-4">
                  <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                    <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Shipping Address</h4>
                    <p className="text-sm font-medium text-stone-900">{order.shippingAddress.name}</p>
                    <p className="text-sm text-stone-600 mt-1">{order.shippingAddress.line1}</p>
                    {order.shippingAddress.line2 && <p className="text-sm text-stone-600">{order.shippingAddress.line2}</p>}
                    <p className="text-sm text-stone-600">{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
                    <p className="text-sm text-stone-600 mt-1 font-mono">📞 {order.shippingAddress.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between px-6 py-4 bg-stone-50 border-t border-stone-100">
                <div className="text-stone-700">
                  Total: <span className="font-semibold text-stone-900">₹{(order.total / 100).toLocaleString('en-IN')}</span>
                </div>
                <select
                  className="px-3 py-1.5 rounded-xl border border-stone-300 text-sm font-medium focus:ring-2 focus:ring-stone-400 outline-none bg-white"
                  value={order.status}
                  onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
