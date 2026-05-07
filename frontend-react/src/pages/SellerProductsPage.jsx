import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'

export default function SellerProductsPage({ user }) {
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api(`/catalog/seller/${user.id}/products`)
      setProducts(data)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const handleEdit = (product) => {
    setEditingId(product.id)
    setEditForm({
      name: product.name,
      price: product.price / 100,
      stock: product.stock,
      status: product.status,
    })
  }

  const handleSaveEdit = async (productId) => {
    try {
      await api(`/catalog/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name,
          price: Math.round(Number(editForm.price) * 100),
          stock: Number(editForm.stock),
          status: editForm.status,
        }),
      })
      toast('Product updated!', 'success')
      setEditingId(null)
      fetchProducts()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const handleArchive = async (productId) => {
    if (!confirm('Archive this product? It will be hidden from buyers.')) return
    try {
      await api(`/catalog/products/${productId}`, { method: 'DELETE' })
      toast('Product archived', 'success')
      fetchProducts()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const statusColor = (status) => {
    if (status === 'active') return 'bg-green-100 text-green-800'
    if (status === 'draft') return 'bg-amber-100 text-amber-800'
    return 'bg-stone-100 text-stone-600'
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-stone-500">
        <div className="w-8 h-8 border-3 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
        <p>Loading products...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-3xl font-bold text-stone-900">My Products</h2>
        <span className="text-sm text-stone-500 bg-stone-100 px-3 py-1 rounded-full font-medium">
          {products.length} total
        </span>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <p className="text-3xl mb-3">📦</p>
          <h3 className="font-semibold text-stone-900 mb-1">No products yet</h3>
          <p className="text-stone-600">Go to "Add Product" to list your first item!</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Image</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Price</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Stock</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={`border-b border-stone-100 last:border-b-0 hover:bg-stone-50/50 transition ${editingId === p.id ? 'bg-amber-50/40' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 flex items-center justify-center">
                      {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-lg">📦</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {editingId === p.id ? (
                      <input
                        className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-stone-400 outline-none"
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    ) : (
                      <span className="font-medium text-stone-900 text-sm">{p.name}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {editingId === p.id ? (
                      <input
                        className="w-20 px-3 py-1.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-stone-400 outline-none"
                        type="number"
                        value={editForm.price}
                        onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                      />
                    ) : (
                      <span className="text-sm text-stone-700">₹{(p.price / 100).toLocaleString('en-IN')}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {editingId === p.id ? (
                      <input
                        className="w-16 px-3 py-1.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-stone-400 outline-none"
                        type="number"
                        value={editForm.stock}
                        onChange={(e) => setEditForm((f) => ({ ...f, stock: e.target.value }))}
                      />
                    ) : (
                      <span className="text-sm text-stone-700">{p.stock}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {editingId === p.id ? (
                      <select
                        className="px-3 py-1.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-stone-400 outline-none"
                        value={editForm.status}
                        onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                      >
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="archived">Archived</option>
                      </select>
                    ) : (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor(p.status)}`}>
                        {p.status}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {editingId === p.id ? (
                      <div className="flex gap-2">
                        <button className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition" onClick={() => handleSaveEdit(p.id)}>Save</button>
                        <button className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-600 text-xs font-medium hover:bg-stone-50 transition" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 text-xs font-medium hover:bg-stone-50 transition" onClick={() => handleEdit(p)}>Edit</button>
                        {p.status !== 'archived' && (
                          <button className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition" onClick={() => handleArchive(p.id)}>Archive</button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
