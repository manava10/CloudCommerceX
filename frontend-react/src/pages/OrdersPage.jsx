import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'

const STATUS_FLOW = ['CREATED', 'PAID', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED']
const CANCELLABLE_STATUSES = ['CREATED', 'PAID', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY']

const statusMeta = {
  CREATED:          { label: 'Order Placed',      icon: '📝', color: 'text-amber-600',   bg: 'bg-amber-500' },
  PAID:             { label: 'Payment Confirmed',  icon: '💳', color: 'text-indigo-600',  bg: 'bg-indigo-500' },
  PROCESSING:       { label: 'Processing',         icon: '⚙️', color: 'text-blue-600',    bg: 'bg-blue-500' },
  SHIPPED:          { label: 'Shipped',             icon: '📦', color: 'text-violet-600',  bg: 'bg-violet-500' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery',    icon: '🚚', color: 'text-orange-600',  bg: 'bg-orange-500' },
  DELIVERED:        { label: 'Delivered',            icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-500' },
  CANCELLED:        { label: 'Cancelled',            icon: '❌', color: 'text-red-600',     bg: 'bg-red-500' },
}

function StatusTracker({ status }) {
  const isCancelled = status === 'CANCELLED'

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 py-4 px-1">
        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-sm">❌</div>
        <span className="text-red-600 font-semibold text-sm">Order Cancelled</span>
      </div>
    )
  }

  const currentIdx = STATUS_FLOW.indexOf(status)

  return (
    <div className="py-4 px-1">
      <div className="flex items-center">
        {STATUS_FLOW.map((step, idx) => {
          const meta = statusMeta[step]
          const isCompleted = idx <= currentIdx
          const isCurrent = idx === currentIdx
          const isLast = idx === STATUS_FLOW.length - 1

          return (
            <div key={step} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
              {/* Step dot */}
              <div className="flex flex-col items-center relative">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-300 ${
                    isCompleted
                      ? `${meta.bg} text-white shadow-sm`
                      : 'bg-stone-200 text-stone-400'
                  } ${isCurrent ? 'ring-4 ring-offset-2 ring-stone-200 scale-110' : ''}`}
                >
                  {isCompleted ? meta.icon : (idx + 1)}
                </div>
                <span className={`absolute -bottom-6 text-[10px] font-medium whitespace-nowrap ${
                  isCompleted ? meta.color : 'text-stone-400'
                }`}>
                  {meta.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 h-1 mx-1.5 rounded-full overflow-hidden bg-stone-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      idx < currentIdx ? 'bg-stone-800 w-full' : 'w-0'
                    }`}
                    style={{ width: idx < currentIdx ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function OrdersPage({ user, products }) {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState(null)

  const fetchOrders = () => {
    if (!user) return
    setLoading(true)
    api(`/order/orders?userId=${encodeURIComponent(user.id)}`)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchOrders() }, [user])

  const getProduct = (id) => products.find((p) => p.id === id)

  const canCancel = (status) => CANCELLABLE_STATUSES.includes(status)

  const handleCancel = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?')) return
    setCancellingId(orderId)
    try {
      await api(`/order/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      toast('Order cancelled successfully.', 'success')
      fetchOrders()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setCancellingId(null)
    }
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

  const statusBadge = (status) => {
    const meta = statusMeta[status] || statusMeta.CREATED
    const badgeColors = {
      CREATED: 'bg-amber-100 text-amber-800',
      PAID: 'bg-indigo-100 text-indigo-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      SHIPPED: 'bg-violet-100 text-violet-800',
      OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-800',
      DELIVERED: 'bg-emerald-100 text-emerald-800',
      CANCELLED: 'bg-red-100 text-red-800',
    }
    return badgeColors[status] || 'bg-stone-100 text-stone-800'
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link to="/" className="text-stone-600 hover:text-stone-900 text-sm mb-6 inline-block">
        ← Back to Shop
      </Link>
      <h1 className="text-3xl font-bold text-stone-900 mb-2">My Orders</h1>
      <p className="text-stone-600 mb-8">Track your orders and their delivery status.</p>

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
                <div className="h-10 bg-stone-200 rounded w-full mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <p className="text-3xl mb-3">🛍️</p>
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
            <li key={order.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300">
              {/* Header */}
              <div className="p-6 border-b border-stone-100 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="font-semibold text-stone-900">Order #{order.id}</span>
                  <span className="ml-3 text-sm text-stone-500">{formatDate(order.createdAt)}</span>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wide ${statusBadge(order.status)}`}>
                  {statusMeta[order.status]?.label || order.status}
                </span>
              </div>

              {/* Status Tracker */}
              <div className="px-6 pt-4 pb-8">
                <StatusTracker status={order.status} />
              </div>

              {/* Items */}
              <div className="px-6 pb-4">
                <ul className="space-y-2">
                  {order.items?.map((item) => (
                    <li key={item.productId} className="flex justify-between text-stone-700 text-sm">
                      <span>
                        {getProduct(item.productId)?.name || item.productId} × {item.qty || 1}
                      </span>
                      <span>₹{((item.price || 0) * (item.qty || 1)).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
                <div className="font-semibold text-stone-900 text-lg">
                  Total: ₹{order.total?.toLocaleString()}
                </div>

                {canCancel(order.status) && (
                  <button
                    onClick={() => handleCancel(order.id)}
                    disabled={cancellingId === order.id}
                    className="px-5 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition"
                  >
                    {cancellingId === order.id ? 'Cancelling...' : '✕ Cancel Order'}
                  </button>
                )}

                {order.status === 'CANCELLED' && (
                  <span className="text-sm text-red-500 font-medium">This order has been cancelled.</span>
                )}

                {order.status === 'DELIVERED' && (
                  <span className="text-sm text-emerald-600 font-medium">✓ Delivered successfully</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
