import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'

export default function SellerRegisterPage({ onSuccess }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '', password: '', storeName: '', storeDescription: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password || !form.storeName) {
      setError('Email, password, and store name are required')
      return
    }
    setError('')
    setLoading(true)
    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          role: 'seller',
          storeName: form.storeName,
          storeDescription: form.storeDescription,
        }),
        skipLogoutOn401: true,
      })

      const loginData = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.email, password: form.password }),
        skipLogoutOn401: true,
      })

      const userData = { ...loginData.user, token: loginData.token }
      localStorage.setItem('cloudcommercx_user', JSON.stringify(userData))

      toast('Seller account created! Welcome to your dashboard.', 'success')
      if (onSuccess) onSuccess(userData)
      navigate('/seller')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
      <Link to="/" className="text-stone-600 hover:text-stone-900 text-sm mb-6 inline-block">← Back to Shop</Link>

      <div className="grid md:grid-cols-2 gap-12 items-start">
        {/* Left — Info */}
        <div className="pt-4">
          <h1 className="text-4xl font-bold text-stone-900 tracking-tight leading-tight">
            Start selling on <br />CloudCommercX
          </h1>
          <p className="mt-4 text-stone-600 text-lg font-light leading-relaxed">
            Join our marketplace and reach thousands of buyers. List your products, manage orders, and grow your business.
          </p>

          <div className="mt-10 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-lg flex-shrink-0">📦</div>
              <div>
                <h3 className="font-semibold text-stone-900">List Products</h3>
                <p className="text-sm text-stone-500 mt-0.5">Add unlimited products with images, descriptions, and pricing.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-lg flex-shrink-0">📋</div>
              <div>
                <h3 className="font-semibold text-stone-900">Track Orders</h3>
                <p className="text-sm text-stone-500 mt-0.5">See incoming orders in real-time and update their status.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-lg flex-shrink-0">📊</div>
              <div>
                <h3 className="font-semibold text-stone-900">Analytics Dashboard</h3>
                <p className="text-sm text-stone-500 mt-0.5">Monitor revenue, product performance, and store growth.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Form */}
        <div className="bg-white rounded-2xl border border-stone-200 p-8">
          <h2 className="text-2xl font-semibold text-stone-900">Create Seller Account</h2>
          <p className="mt-2 text-stone-600">Fill in your store details to get started.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Store Name *</label>
              <input
                name="storeName"
                value={form.storeName}
                onChange={handleChange}
                placeholder="My Awesome Store"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Store Description</label>
              <textarea
                name="storeDescription"
                value={form.storeDescription}
                onChange={handleChange}
                placeholder="Tell buyers about your store..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email *</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="seller@example.com"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Password *</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                minLength={6}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none"
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-800 disabled:opacity-50 transition"
            >
              {loading ? 'Creating Account...' : 'Create Seller Account'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-stone-600">
            Already have an account?{' '}
            <Link to="/" className="text-stone-900 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
