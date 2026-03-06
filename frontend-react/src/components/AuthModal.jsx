import { useState } from 'react'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'

export default function AuthModal({ open, mode, onClose, onSuccess, onSwitchMode }) {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        setError('')
        toast('Account created! Sign in below.', 'success')
        onSwitchMode()
      } else {
        const data = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        onSuccess({ id: data.user.id, email: data.user.email, token: data.token })
        setEmail('')
        setPassword('')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    onSwitchMode()
    setError('')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-8">
        <h2 className="text-2xl font-semibold text-stone-900">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </h2>
        <p className="mt-2 text-stone-600">
          {mode === 'login' ? 'Sign in to add items to cart and checkout.' : 'Sign up to make purchases.'}
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-800 disabled:opacity-50 transition"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-600">
          {mode === 'login' ? (
            <>No account?{' '}
              <button type="button" onClick={switchMode} className="text-stone-900 font-medium hover:underline">
                Sign up
              </button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button type="button" onClick={switchMode} className="text-stone-900 font-medium hover:underline">
                Sign in
              </button>
            </>
          )}
        </p>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-stone-100 text-stone-500"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
