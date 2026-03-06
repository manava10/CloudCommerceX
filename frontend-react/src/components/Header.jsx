import { Link } from 'react-router-dom'
import NotificationsDropdown from './NotificationsDropdown'

export default function Header({ user, cartCount, onLogin, onSignup, onLogout, onCartClick }) {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link to="/" className="text-xl font-bold text-stone-900 tracking-tight">
          CloudCommercX
        </Link>
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-stone-600">{user.email}</span>
              <NotificationsDropdown user={user} />
              <Link
                to="/orders"
                className="text-sm text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-lg hover:bg-stone-100"
              >
                My Orders
              </Link>
              <button
                onClick={onCartClick}
                className="relative p-2 rounded-lg hover:bg-stone-100 transition"
              >
                <svg className="w-6 h-6 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
              <button
                onClick={onLogout}
                className="text-sm text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-lg hover:bg-stone-100"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onLogin}
                className="text-sm text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-lg hover:bg-stone-100"
              >
                Login
              </button>
              <button
                onClick={onSignup}
                className="text-sm text-white bg-stone-900 hover:bg-stone-800 px-4 py-2 rounded-lg"
              >
                Sign up
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
