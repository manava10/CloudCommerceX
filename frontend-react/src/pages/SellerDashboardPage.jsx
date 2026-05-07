import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'

const fulfillmentOptions = [
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default function SellerDashboardPage({ user }) {
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    price: '',
    stock: '',
    image: '',
    description: '',
  })

  const sellerId = user?.sellerId

  const loadSellerData = async () => {
    if (!sellerId) return
    setLoading(true)
    try {
      const [productList, orderList] = await Promise.all([
        api(`/catalog/sellers/${sellerId}/products`),
        api(`/order/sellers/${sellerId}/orders`),
      ])
      setProducts(productList || [])
      setOrders(orderList || [])
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSellerData()
  }, [sellerId])

  const stats = useMemo(() => {
    const paidOrders = orders.filter((order) => order.paymentStatus === 'PAID')
    const revenue = paidOrders.reduce(
      (sum, order) =>
        sum + order.items.reduce((itemSum, item) => itemSum + Number(item.price) * Number(item.qty || 1), 0),
      0
    )
    return {
      products: products.length,
      orders: orders.length,
      paidOrders: paidOrders.length,
      revenue,
    }
  }, [orders, products])

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api('/catalog/products', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          stock: Number(form.stock),
        }),
      })
      setForm({ name: '', price: '', stock: '', image: '', description: '' })
      toast('Product listed successfully.', 'success')
      await loadSellerData()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!sellerId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-stone-900">Seller account required</h1>
        <p className="mt-2 text-stone-600">Create a seller account to list products and track orders.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">{user.storeName || 'Seller Store'}</p>
          <h1 className="text-3xl font-bold text-stone-900">Seller Dashboard</h1>
          <p className="mt-1 text-stone-600">List products and monitor incoming orders.</p>
        </div>
        <span className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white">
          Seller ID: {sellerId}
        </span>
      </div>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Listed products" value={stats.products} />
        <Stat label="Incoming orders" value={stats.orders} />
        <Stat label="Paid orders" value={stats.paidOrders} />
        <Stat label="Revenue" value={`₹${stats.revenue.toLocaleString()}`} />
      </section>

      <section className="grid gap-8 lg:grid-cols-[420px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-stone-900">List New Item</h2>
          <div className="mt-5 space-y-4">
            <Field label="Product name" value={form.name} onChange={(value) => updateForm('name', value)} required />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Price" type="number" value={form.price} onChange={(value) => updateForm('price', value)} required />
              <Field label="Stock" type="number" value={form.stock} onChange={(value) => updateForm('stock', value)} required />
            </div>
            <Field label="Image URL" value={form.image} onChange={(value) => updateForm('image', value)} />
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-400"
                placeholder="Short product description"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-6 w-full rounded-xl bg-stone-900 py-3 font-medium text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {saving ? 'Listing...' : 'List Item'}
          </button>
        </form>

        <div className="space-y-8">
          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-stone-900">Your Products</h2>
            {loading ? (
              <p className="mt-4 text-stone-500">Loading products...</p>
            ) : products.length === 0 ? (
              <p className="mt-4 text-stone-500">No products listed yet.</p>
            ) : (
              <ul className="mt-5 divide-y divide-stone-100">
                {products.map((product) => (
                  <li key={product.id} className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p className="font-medium text-stone-900">{product.name}</p>
                      <p className="text-sm text-stone-500">Stock: {product.stock}</p>
                    </div>
                    <span className="font-semibold text-stone-900">₹{product.price?.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-stone-900">Received Orders</h2>
            {loading ? (
              <p className="mt-4 text-stone-500">Loading orders...</p>
            ) : orders.length === 0 ? (
              <p className="mt-4 text-stone-500">No incoming orders yet.</p>
            ) : (
              <ul className="mt-5 space-y-4">
                {orders.map((order) => (
                  <li key={order.id} className="rounded-xl border border-stone-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-stone-900">Order #{order.id}</p>
                        <p className="text-sm text-stone-500">Customer: {order.userId}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-sm font-medium ${order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {order.paymentStatus}
                      </span>
                    </div>
                    <ul className="mt-4 space-y-4">
                      {order.items.map((item) => (
                        <li key={`${order.id}-${item.productId}`} className="rounded-xl bg-stone-50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-stone-900">{item.productId} x {item.qty || 1}</p>
                              <p className="text-sm text-stone-500">
                                Item total: ₹{(Number(item.price) * Number(item.qty || 1)).toLocaleString()}
                              </p>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-stone-700">
                              {formatFulfillment(item.fulfillmentStatus)}
                            </span>
                          </div>
                          <TrackingEditor
                            sellerId={sellerId}
                            orderId={order.id}
                            item={item}
                            onSaved={loadSellerData}
                          />
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-stone-900">{value}</p>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-stone-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-400"
      />
    </div>
  )
}

function TrackingEditor({ sellerId, orderId, item, onSaved }) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({
    fulfillmentStatus: item.fulfillmentStatus || 'PROCESSING',
    courier: item.courier || '',
    trackingId: item.trackingId || '',
    estimatedDeliveryDate: normalizeDate(item.estimatedDeliveryDate),
  })

  const updateDraft = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  const saveTracking = async () => {
    setSaving(true)
    try {
      await api(`/order/sellers/${sellerId}/orders/${orderId}/items/${item.productId}/tracking`, {
        method: 'PATCH',
        body: JSON.stringify(draft),
      })
      toast('Tracking updated.', 'success')
      await onSaved()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">Fulfillment</label>
        <select
          value={draft.fulfillmentStatus}
          onChange={(e) => updateDraft('fulfillmentStatus', e.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-300"
        >
          {fulfillmentOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">Expected delivery</label>
        <input
          type="date"
          value={draft.estimatedDeliveryDate}
          onChange={(e) => updateDraft('estimatedDeliveryDate', e.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-300"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">Courier</label>
        <input
          value={draft.courier}
          onChange={(e) => updateDraft('courier', e.target.value)}
          placeholder="BlueDart"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-300"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">Tracking ID</label>
        <input
          value={draft.trackingId}
          onChange={(e) => updateDraft('trackingId', e.target.value)}
          placeholder="BD123456789"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-300"
        />
      </div>
      <button
        type="button"
        onClick={saveTracking}
        disabled={saving}
        className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50 md:col-span-2"
      >
        {saving ? 'Updating...' : 'Update Tracking'}
      </button>
    </div>
  )
}

function formatFulfillment(status = 'PROCESSING') {
  return fulfillmentOptions.find((option) => option.value === status)?.label || status
}

function normalizeDate(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}
