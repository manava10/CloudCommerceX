import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'

const trackingSteps = ['PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED']

export default function OrderConfirmationPage({ user, products }) {
  const toast = useToast()
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  const loadOrder = async () => {
    if (!orderId || !user) return
    setLoading(true)
    return api(`/order/orders?userId=${encodeURIComponent(user.id)}`)
      .then((orders) => {
        const o = orders.find((x) => x.id === orderId)
        setOrder(o || null)
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadOrder()
  }, [orderId, user])

  const getProduct = (id) => products.find((p) => p.id === id)

  const cancelOrder = async () => {
    if (!order) return
    setCancelling(true)
    try {
      const updated = await api(`/order/orders/${order.id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ userId: user.id }),
      })
      setOrder(updated)
      toast('Order cancelled.', 'success')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setCancelling(false)
    }
  }

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
              <li key={item.productId} className="rounded-xl bg-stone-50 p-4">
                <div className="flex justify-between gap-4">
                  <span>{getProduct(item.productId)?.name || item.productId} × {item.qty || 1}</span>
                  <span>₹{((item.price || 0) * (item.qty || 1)).toLocaleString()}</span>
                </div>
                <TrackingSummary item={item} />
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
        {canCancelOrder(order) && (
          <button
            onClick={cancelOrder}
            disabled={cancelling}
            className="px-6 py-3 rounded-xl border border-red-200 text-red-700 font-medium hover:bg-red-50 disabled:opacity-50"
          >
            {cancelling ? 'Cancelling...' : 'Cancel order'}
          </button>
        )}
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

function TrackingSummary({ item }) {
  const status = item.fulfillmentStatus || 'PROCESSING'
  const activeIndex = Math.max(0, trackingSteps.indexOf(status))
  const cancelled = status === 'CANCELLED'

  return (
    <div className="mt-4 border-t border-stone-200 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-stone-900">
          Tracking: {formatFulfillment(status)}
        </p>
        {item.estimatedDeliveryDate && !cancelled && (
          <p className="text-sm text-stone-600">Expected by {formatDateOnly(item.estimatedDeliveryDate)}</p>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {trackingSteps.map((step, index) => (
          <div
            key={step}
            className={`rounded-lg px-3 py-2 text-center text-xs font-medium ${
              !cancelled && index <= activeIndex
                ? 'bg-green-100 text-green-800'
                : 'bg-white text-stone-500'
            }`}
          >
            {formatFulfillment(step)}
          </div>
        ))}
      </div>
      {(item.courier || item.trackingId) && (
        <p className="mt-3 text-sm text-stone-600">
          {item.courier && <>Courier: <span className="font-medium text-stone-800">{item.courier}</span></>}
          {item.courier && item.trackingId && <span className="mx-2 text-stone-300">|</span>}
          {item.trackingId && <>Tracking ID: <span className="font-medium text-stone-800">{item.trackingId}</span></>}
        </p>
      )}
    </div>
  )
}

function canCancelOrder(order) {
  if (!order || order.status === 'CANCELLED') return false
  return order.items?.every((item) => {
    const status = item.fulfillmentStatus || 'PROCESSING'
    return status !== 'DELIVERED' && status !== 'CANCELLED'
  })
}

function formatFulfillment(status) {
  const labels = {
    PROCESSING: 'Processing',
    SHIPPED: 'Shipped',
    OUT_FOR_DELIVERY: 'Out for delivery',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  }
  return labels[status] || status
}

function formatDateOnly(d) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
