import { NavLink } from 'react-router-dom'

export default function SellerSidebar({ user }) {
  const links = [
    { to: '/seller', icon: '📊', label: 'Dashboard', end: true },
    { to: '/seller/products', icon: '📦', label: 'Products' },
    { to: '/seller/add-product', icon: '➕', label: 'Add Product' },
    { to: '/seller/orders', icon: '📋', label: 'Orders' },
  ]

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-white border-r border-stone-200 flex flex-col z-40">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-stone-200">
        <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {(user?.storeName || 'S')[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-stone-900 text-sm truncate">{user?.storeName || 'My Store'}</div>
          <div className="text-xs text-stone-500 uppercase tracking-wide">Seller Portal</div>
        </div>
      </div>

      <nav className="flex-1 py-3 px-3 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`
            }
          >
            <span className="text-base">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4 border-t border-stone-200 pt-3">
        <NavLink
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
        >
          <span className="text-base">🛒</span>
          <span>Back to Store</span>
        </NavLink>
      </div>
    </aside>
  )
}
