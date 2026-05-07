import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { api } from './lib/api'
import { ToastProvider, useToast } from './context/ToastContext'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import ProductDetailPage from './pages/ProductDetailPage'
import OrdersPage from './pages/OrdersPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderConfirmationPage from './pages/OrderConfirmationPage'
import SellerRegisterPage from './pages/SellerRegisterPage'
import SellerDashboardPage from './pages/SellerDashboardPage'
import SellerProductsPage from './pages/SellerProductsPage'
import SellerAddProductPage from './pages/SellerAddProductPage'
import SellerOrdersPage from './pages/SellerOrdersPage'
import SellerSidebar from './components/SellerSidebar'
import AuthModal from './components/AuthModal'
import CartDrawer from './components/CartDrawer'
import ProtectedRoute from './components/ProtectedRoute'

function SellerLayout({ user, children }) {
  return (
    <div className="flex min-h-screen bg-stone-50">
      <SellerSidebar user={user} />
      <main className="flex-1 ml-[260px] p-8">
        {children}
      </main>
    </div>
  )
}

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
      <RoutesWrapper
        user={user}
        products={products}
        productsLoading={productsLoading}
        cart={cart}
        cartLoading={cartLoading}
        showAuth={showAuth}
        setShowAuth={setShowAuth}
        showCart={showCart}
        setShowCart={setShowCart}
        authMode={authMode}
        setAuthMode={setAuthMode}
        onAuthSuccess={onAuthSuccess}
        setUser={setUser}
        addToCart={addToCart}
        removeFromCart={removeFromCart}
        refreshCart={refreshCart}
      />
    </BrowserRouter>
  )
}

function RoutesWrapper({
  user, products, productsLoading, cart, cartLoading,
  showAuth, setShowAuth, showCart, setShowCart, authMode, setAuthMode,
  onAuthSuccess, setUser, addToCart, removeFromCart, refreshCart
}) {
  const location = useLocation()
  const isSellerDashboard = location.pathname.startsWith('/seller') && location.pathname !== '/seller/register'

  // Show header on all pages EXCEPT the seller dashboard (which has its own sidebar)
  const showHeader = !isSellerDashboard

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {showHeader && (
        <Header
          user={user}
          cartCount={cart.reduce((s, i) => s + (i.qty || 1), 0)}
          onLogin={() => { setAuthMode('login'); setShowAuth(true) }}
          onSignup={() => { setAuthMode('signup'); setShowAuth(true) }}
          onLogout={() => setUser(null)}
          onCartClick={() => setShowCart(true)}
        />
      )}

      <div className="flex-1">
        <Routes>
          {/* ── Buyer routes ── */}
          <Route path="/" element={<HomePage products={products} productsLoading={productsLoading} onAddToCart={addToCart} />} />
          <Route path="/product/:id" element={<ProductDetailPage products={products} productsLoading={productsLoading} onAddToCart={addToCart} cart={cart} user={user} />} />
          <Route path="/orders" element={<ProtectedRoute user={user}><OrdersPage user={user} products={products} /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute user={user}><CheckoutPage user={user} cart={cart} products={products} onCartCleared={refreshCart} /></ProtectedRoute>} />
          <Route path="/order-confirmation/:orderId" element={<ProtectedRoute user={user}><OrderConfirmationPage user={user} products={products} /></ProtectedRoute>} />

          {/* ── Seller registration (shows header, same as homepage) ── */}
          <Route path="/seller/register" element={<SellerRegisterPage onSuccess={onAuthSuccess} />} />

          {/* ── Seller dashboard routes ── */}
          <Route path="/seller" element={
            <ProtectedRoute user={user}>
              <SellerLayout user={user}>
                <SellerDashboardPage user={user} />
              </SellerLayout>
            </ProtectedRoute>
          } />
          <Route path="/seller/products" element={
            <ProtectedRoute user={user}>
              <SellerLayout user={user}>
                <SellerProductsPage user={user} />
              </SellerLayout>
            </ProtectedRoute>
          } />
          <Route path="/seller/add-product" element={
            <ProtectedRoute user={user}>
              <SellerLayout user={user}>
                <SellerAddProductPage user={user} />
              </SellerLayout>
            </ProtectedRoute>
          } />
          <Route path="/seller/orders" element={
            <ProtectedRoute user={user}>
              <SellerLayout user={user}>
                <SellerOrdersPage user={user} />
              </SellerLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </div>

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
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}
