import { useMemo, useState } from 'react'
import Hero from '../components/Hero'
import ProductGrid from '../components/ProductGrid'

export default function HomePage({ products, productsLoading, onAddToCart }) {
  const [search, setSearch] = useState('')

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return products
    return products.filter((product) => {
      const searchable = [
        product.name,
        product.description,
        product.storeName,
        product.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return searchable.includes(query)
    })
  }, [products, search])

  return (
    <>
      <Hero />
      <main id="shop-section" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-stone-900">Shop Essentials</h2>
            <p className="mt-2 text-stone-600">
              {productsLoading
                ? 'Loading catalog...'
                : `${filteredProducts.length} of ${products.length} products shown`}
            </p>
          </div>
          <div className="relative w-full lg:max-w-md">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search keyboards, monitors, earbuds..."
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 pr-11 text-stone-900 outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-300"
            />
            <svg className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />
            </svg>
          </div>
        </div>
        <ProductGrid products={filteredProducts} loading={productsLoading} onAddToCart={onAddToCart} searchQuery={search} />
      </main>
    </>
  )
}
