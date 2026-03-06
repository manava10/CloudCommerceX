import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function CheckoutPage({ user, cart, products, onCartCleared }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [address, setAddress] = useState({
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
  })
  const [payment, setPayment] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
  })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const getProduct = (id) => products.find((p) => p.id === id)
  const total = cart.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0)

  const validateAddress = () => {
    if (!address.name?.trim()) return 'Name is required'
    if (!address.line1?.trim()) return 'Address is required'
    if (!address.city?.trim()) return 'City is required'
    if (!address.phone?.trim()) return 'Phone is required'
    return null
  }

  const validatePayment = () => {
    if (!payment.cardNumber?.replace(/\s/g).match(/^\d{16}$/)) return 'Enter valid 16-digit card number'
    if (!payment.expiry?.match(/^\d{2}\/\d{2}$/)) return 'Enter expiry as MM/YY'
    if (!payment.cvv?.match(/^\d{3,4}$/)) return 'Enter valid CVV'
    return null
  }

  const handlePlaceOrder = async () => {
    const err = validatePayment()
    if (err) {
      setError(err)
      return
    }
    setError('')
    setLoading(true)
    try {
      const order = await api('/order/orders', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          items: cart,
          shippingAddress: address,
        }),
      })
      await api('/payment/payments', {
        method: 'POST',
        body: JSON.stringify({ orderId: order.id, amount: order.total, userId: user.id }),
      })
      await api(`/order/orders/${order.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'PAID' }),
      }).catch(() => {})
      await api(`/cart/cart/${user.id}`, { method: 'DELETE' })
      onCartCleared?.()
      navigate(`/order-confirmation/${order.id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (cart.length === 0 && step < 3) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-stone-600 mb-4">Your cart is empty.</p>
        <Link to="/" className="text-stone-900 font-medium hover:underline">Continue shopping</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <Link to="/" className="text-stone-600 hover:text-stone-900 text-sm mb-6 inline-block">← Back to Shop</Link>
      <h1 className="text-2xl font-bold text-stone-900 mb-8">Checkout</h1>

      <div className="flex gap-2 mb-8">
        <span className={`px-3 py-1 rounded-full text-sm ${step >= 1 ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-600'}`}>1. Address</span>
        <span className={`px-3 py-1 rounded-full text-sm ${step >= 2 ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-600'}`}>2. Payment</span>
      </div>

      {step === 1 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
          <h2 className="font-semibold text-stone-900 mb-4">Shipping Address</h2>
          <div className="space-y-4">
            <input
              placeholder="Full name"
              value={address.name}
              onChange={(e) => setAddress({ ...address, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 outline-none"
            />
            <input
              placeholder="Address line 1"
              value={address.line1}
              onChange={(e) => setAddress({ ...address, line1: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 outline-none"
            />
            <input
              placeholder="Address line 2 (optional)"
              value={address.line2}
              onChange={(e) => setAddress({ ...address, line2: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 outline-none"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                placeholder="City"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 outline-none"
              />
              <input
                placeholder="State"
                value={address.state}
                onChange={(e) => setAddress({ ...address, state: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                placeholder="ZIP"
                value={address.zip}
                onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 outline-none"
              />
              <input
                placeholder="Phone"
                value={address.phone}
                onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 outline-none"
              />
            </div>
          </div>
          <button
            onClick={() => {
              const err = validateAddress()
              if (err) setError(err)
              else { setError(''); setStep(2) }
            }}
            className="mt-6 w-full py-3 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-800"
          >
            Continue to Payment
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
          <h2 className="font-semibold text-stone-900 mb-4">Payment Details (Mock)</h2>
          <p className="text-sm text-stone-500 mb-4">This is a demo. Use any 16-digit number, MM/YY, and 3-digit CVV.</p>
          <div className="space-y-4">
            <input
              placeholder="Card number (16 digits)"
              value={payment.cardNumber}
              onChange={(e) => setPayment({ ...payment, cardNumber: e.target.value.replace(/\D/g, '').slice(0, 16) })}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 outline-none"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                placeholder="MM/YY"
                value={payment.expiry}
                onChange={(e) => setPayment({ ...payment, expiry: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 outline-none"
              />
              <input
                placeholder="CVV"
                value={payment.cvv}
                onChange={(e) => setPayment({ ...payment, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 outline-none"
              />
            </div>
          </div>
          {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 rounded-xl border border-stone-300 text-stone-700 font-medium hover:bg-stone-50"
            >
              Back
            </button>
            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-800 disabled:opacity-50"
            >
              {loading ? 'Placing order...' : `Pay ₹${total.toLocaleString()}`}
            </button>
          </div>
        </div>
      )}

      <div className="bg-stone-100 rounded-2xl p-6">
        <h3 className="font-semibold text-stone-900 mb-4">Order Summary</h3>
        <ul className="space-y-2 mb-4">
          {cart.map((item) => {
            const p = getProduct(item.productId)
            return (
              <li key={item.productId} className="flex justify-between text-sm">
                <span>{p?.name || item.productId} × {item.qty || 1}</span>
                <span>₹{((item.price || 0) * (item.qty || 1)).toLocaleString()}</span>
              </li>
            )
          })}
        </ul>
        <div className="pt-4 border-t border-stone-200 flex justify-between font-semibold text-stone-900">
          <span>Total</span>
          <span>₹{total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
