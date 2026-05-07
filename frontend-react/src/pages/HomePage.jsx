import { useState, useMemo } from 'react'
import Hero from '../components/Hero'
import ProductGrid from '../components/ProductGrid'

export default function HomePage({ products, productsLoading, onAddToCart }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  // Dynamically extract unique categories from products
  const categories = useMemo(() => {
    const cats = products.map(p => p.category).filter(Boolean)
    return ['All', ...new Set(cats)]
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, searchQuery, selectedCategory])

  return (
    <>
      <Hero />
      <main id="shop-section" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h2 className="text-3xl font-bold text-stone-900">Shop Essentials</h2>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none transition-all text-sm"
              />
              <svg className="w-5 h-5 text-stone-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {categories.length > 1 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-48 px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none transition-all text-sm bg-white"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        
        {filteredProducts.length === 0 && !productsLoading ? (
          <div className="text-center py-20 bg-stone-50 rounded-2xl border border-stone-100">
            <p className="text-stone-500 text-lg">No products found matching your search.</p>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="mt-4 text-stone-900 font-medium hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <ProductGrid products={filteredProducts} loading={productsLoading} onAddToCart={onAddToCart} />
        )}
      </main>
    </>
  )
}
