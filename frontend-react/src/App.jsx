import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { api } from './lib/api'
import { ToastProvider, useToast } from './context/ToastContext'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import OrdersPage from './pages/OrdersPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderConfirmationPage from './pages/OrderConfirmationPage'
import AuthModal from './components/AuthModal'
import CartDrawer from './components/CartDrawer'
import ProtectedRoute from './components/ProtectedRoute'

function AppContent() {
  const toast = useToast()
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cloudcommercx_user') || 'null')
    } catch {
      return null
    }
  })
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [cartLoading, setCartLoading] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [authMode, setAuthMode] = useState('login')

  useEffect(() => {
    const handler = () => setUser(null)
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [])

  useEffect(() => {
    if (user) {
      localStorage.setItem('cloudcommercx_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('cloudcommercx_user')
    }
  }, [user])

  useEffect(() => {
    setProductsLoading(true)
    api('/catalog/products').then(setProducts).catch(() => setProducts([])).finally(() => setProductsLoading(false))
  }, [])

  useEffect(() => {
    if (!user) return
    setCartLoading(true)
    api(`/cart/cart/${user.id}`)
      .then((d) => setCart(d.items || []))
      .catch(() => setCart([]))
      .finally(() => setCartLoading(false))
  }, [user])

  const refreshCart = async () => {
    if (!user) return
    setCartLoading(true)
    api(`/cart/cart/${user.id}`)
      .then((d) => setCart(d.items || []))
      .catch(() => setCart([]))
      .finally(() => setCartLoading(false))
  }

  const addToCart = async (product) => {
    if (!user) {
      setAuthMode('login')
      setShowAuth(true)
      return
    }
    try {
      await api(`/cart/cart/${user.id}/items`, {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, qty: 1, price: product.price }),
      })
      refreshCart()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const removeFromCart = async (productId) => {
    if (!user) return
    try {
      await api(`/cart/cart/${user.id}/items/${productId}`, { method: 'DELETE' })
      refreshCart()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const onAuthSuccess = (userData) => {
    setUser(userData)
    setShowAuth(false)
    refreshCart()
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-stone-50">
        <Header
          user={user}
          cartCount={cart.reduce((s, i) => s + (i.qty || 1), 0)}
          onLogin={() => { setAuthMode('login'); setShowAuth(true) }}
          onSignup={() => { setAuthMode('signup'); setShowAuth(true) }}
          onLogout={() => setUser(null)}
          onCartClick={() => setShowCart(true)}
        />
        <Routes>
          <Route path="/" element={<HomePage products={products} productsLoading={productsLoading} onAddToCart={addToCart} />} />
          <Route path="/orders" element={<ProtectedRoute user={user}><OrdersPage user={user} products={products} /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute user={user}><CheckoutPage user={user} cart={cart} products={products} onCartCleared={refreshCart} /></ProtectedRoute>} />
          <Route path="/order-confirmation/:orderId" element={<ProtectedRoute user={user}><OrderConfirmationPage user={user} products={products} /></ProtectedRoute>} />
        </Routes>
        <AuthModal
          open={showAuth}
          mode={authMode}
          onClose={() => setShowAuth(false)}
          onSuccess={onAuthSuccess}
          onSwitchMode={() => setAuthMode((m) => (m === 'login' ? 'signup' : 'login'))}
        />
        <CartDrawer
          open={showCart}
          onClose={() => setShowCart(false)}
          cart={cart}
          cartLoading={cartLoading}
          products={products}
          user={user}
          onRemove={removeFromCart}
          onLogin={() => { setAuthMode('login'); setShowAuth(true); setShowCart(false) }}
        />
      </div>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}
