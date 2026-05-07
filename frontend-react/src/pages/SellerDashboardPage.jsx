import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export default function SellerDashboardPage({ user }) {
  const [stats, setStats] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [statsData, ordersData] = await Promise.all([
          api(`/catalog/seller/${user.id}/stats`),
          api(`/order/orders?sellerId=${user.id}`),
        ])
        setStats(statsData)
        setRecentOrders(ordersData.slice(0, 5))
      } catch (err) {
        console.error('dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user.id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-stone-500">
        <div className="w-8 h-8 border-3 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
        <p>Loading dashboard...</p>
      </div>
    )
  }

  const cards = [
    { icon: '📦', label: 'Products', value: stats?.productCount || 0 },
    { icon: '📋', label: 'Orders', value: stats?.orderCount || 0 },
    { icon: '💰', label: 'Revenue', value: `₹${((stats?.revenue || 0) / 100).toLocaleString('en-IN')}` },
    { icon: '🏪', label: 'Total Stock', value: stats?.totalStock || 0 },
  ]

  const statusColor = (status) => {
    if (status === 'PAID') return 'bg-green-100 text-green-800'
    if (status === 'CREATED') return 'bg-amber-100 text-amber-800'
    if (status === 'PROCESSING') return 'bg-blue-100 text-blue-800'
    if (status === 'SHIPPED') return 'bg-indigo-100 text-indigo-800'
    if (status === 'DELIVERED') return 'bg-emerald-100 text-emerald-800'
    return 'bg-stone-100 text-stone-800'
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-stone-900">
          Welcome back, {user.storeName || user.email} 👋
        </h2>
        <p className="mt-2 text-stone-600 font-light">Here's what's happening with your store today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-stone-200/60 p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center text-2xl">
                {card.icon}
              </div>
              <div>
                <div className="text-2xl font-bold text-stone-900">{card.value}</div>
                <div className="text-xs text-stone-500 uppercase tracking-wide font-medium">{card.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div>
        <h3 className="text-xl font-semibold text-stone-900 mb-4">Recent Orders</h3>
        {recentOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-stone-600">No orders yet. Once buyers purchase your products, they'll show up here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            {recentOrders.map((order, idx) => (
              <div
                key={order.id}
                className={`flex items-center justify-between px-6 py-4 ${
                  idx < recentOrders.length - 1 ? 'border-b border-stone-100' : ''
                } hover:bg-stone-50 transition`}
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono font-semibold text-stone-900 text-sm">#{order.id}</span>
                  <span className="text-sm text-stone-500">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-stone-900">
                    ₹{(order.total / 100).toLocaleString('en-IN')}
                  </span>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
