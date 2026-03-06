import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const getSeenKey = (userId) => `cloudcommercx_notif_seen_${userId || ''}`

export default function NotificationsDropdown({ user }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [lastSeenCount, setLastSeenCount] = useState(() => {
    try {
      const key = getSeenKey(user?.id)
      return parseInt(localStorage.getItem(key) || '0', 10)
    } catch {
      return 0
    }
  })

  const fetchNotifications = (markAsSeen = false) => {
    if (!user) return
    const url = `/notification/notifications?userId=${encodeURIComponent(user.id)}`
    api(url, { skipLogoutOn401: true })
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setNotifications(list)
        if (markAsSeen) {
          setLastSeenCount(list.length)
          try {
            localStorage.setItem(getSeenKey(user.id), String(list.length))
          } catch {}
        }
      })
      .catch(() => setNotifications([]))
  }

  useEffect(() => {
    if (open && user) {
      setLoading(true)
      api(`/notification/notifications?userId=${encodeURIComponent(user.id)}`, { skipLogoutOn401: true })
        .then((data) => {
          const list = Array.isArray(data) ? data : []
          setNotifications(list)
          setLastSeenCount(list.length)
          try {
            localStorage.setItem(getSeenKey(user.id), String(list.length))
          } catch {}
        })
        .catch(() => setNotifications([]))
        .finally(() => setLoading(false))
    }
  }, [open, user])

  useEffect(() => {
    if (!user) return
    try {
      setLastSeenCount(parseInt(localStorage.getItem(getSeenKey(user.id)) || '0', 10))
    } catch {
      setLastSeenCount(0)
    }
    const interval = setInterval(fetchNotifications, 30000)
    const t = setTimeout(fetchNotifications, 150)
    return () => {
      clearInterval(interval)
      clearTimeout(t)
    }
  }, [user])

  const unreadCount = Math.max(0, notifications.length - lastSeenCount)

  const formatDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getMessage = (n) => {
    if (n.type === 'ORDER_CREATED') return `Order #${n.payload?.id || '?'} placed`
    if (n.type === 'PAYMENT_COMPLETED') return `Payment for order #${n.payload?.orderId || '?'} completed`
    return n.type || 'Notification'
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-stone-100 transition"
      >
        <svg className="w-6 h-6 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-medium rounded-full min-w-[1rem] h-4 px-1 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-stone-200 shadow-xl z-50 overflow-hidden">
            <div className="p-4 border-b border-stone-100">
              <h3 className="font-semibold text-stone-900">Notifications</h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <p className="p-4 text-stone-500 text-sm">Loading...</p>
              ) : notifications.length === 0 ? (
                <p className="p-4 text-stone-500 text-sm">No notifications yet.</p>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {notifications.slice(0, 10).map((n) => (
                    <li key={n.id} className="p-4 hover:bg-stone-50">
                      <p className="text-sm text-stone-900">{getMessage(n)}</p>
                      <p className="text-xs text-stone-500 mt-1">{formatDate(n.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
