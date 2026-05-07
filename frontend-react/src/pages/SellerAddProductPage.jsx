import { useState } from 'react'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'

const categories = [
  'Keyboards', 'Mice', 'Monitors', 'Audio', 'Cameras',
  'Accessories', 'Furniture', 'Lighting', 'Storage', 'Tablets', 'Acoustics', 'Other'
]

export default function SellerAddProductPage({ user, onProductAdded }) {
  const toast = useToast()
  const [form, setForm] = useState({
    name: '', description: '', price: '', stock: '', image: '', category: ''
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.price) {
      toast('Name and price are required', 'error')
      return
    }
    setSaving(true)
    try {
      await api('/catalog/products', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: Math.round(Number(form.price) * 100),
          stock: Number(form.stock) || 0,
          image: form.image || null,
          category: form.category || null,
        }),
      })
      toast('Product created successfully!', 'success')
      setForm({ name: '', description: '', price: '', stock: '', image: '', category: '' })
      if (onProductAdded) onProductAdded()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const previewPrice = form.price ? `₹${Number(form.price).toLocaleString('en-IN')}` : '₹0'

  return (
    <div>
      <h2 className="text-3xl font-bold text-stone-900 mb-8">Add New Product</h2>

      <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        {/* Form */}
        <form className="bg-white rounded-2xl border border-stone-200 p-8" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Product Name *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Wireless Bluetooth Speaker"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe your product..."
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Price (₹) *</label>
                <input
                  name="price"
                  type="number"
                  min="1"
                  step="1"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="999"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Stock</label>
                <input
                  name="stock"
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={handleChange}
                  placeholder="50"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none bg-white"
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Product Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files[0]
                  if (!file) return
                  setSaving(true)
                  try {
                    const formData = new FormData()
                    formData.append('image', file)
                    const data = await api('/catalog/upload', {
                      method: 'POST',
                      body: formData,
                    })
                    setForm(f => ({ ...f, image: data.url }))
                    toast('Image uploaded!', 'success')
                  } catch (err) {
                    toast(err.message, 'error')
                  } finally {
                    setSaving(false)
                  }
                }}
                disabled={saving}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-stone-50 file:text-stone-700 hover:file:bg-stone-100"
              />
              {form.image && <p className="text-sm text-green-600 mt-2">Image uploaded successfully!</p>}
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 w-full py-3 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-800 disabled:opacity-50 transition"
            disabled={saving}
          >
            {saving ? 'Creating...' : 'Create Product'}
          </button>
        </form>

        {/* Live Preview */}
        <div className="sticky top-8">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Live Preview</h3>
          <div className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300">
            <div className="aspect-[4/3] bg-stone-50 overflow-hidden">
              {form.image ? (
                <img src={form.image} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 gap-2">
                  <span className="text-4xl">📦</span>
                  <span className="text-sm">Add an image URL</span>
                </div>
              )}
            </div>
            <div className="p-5">
              <h4 className="font-medium text-stone-900 text-lg leading-snug">
                {form.name || 'Product Name'}
              </h4>
              {form.category && (
                <span className="inline-block mt-1 text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                  {form.category}
                </span>
              )}
              <p className="mt-2 text-sm text-stone-500 leading-relaxed line-clamp-3">
                {form.description || 'Product description will appear here...'}
              </p>
              <div className="mt-4 flex justify-between items-center">
                <span className="text-lg font-semibold text-stone-600">{previewPrice}</span>
                <span className="text-xs text-stone-400">Stock: {form.stock || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
