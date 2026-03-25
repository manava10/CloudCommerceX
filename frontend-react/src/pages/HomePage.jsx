import Hero from '../components/Hero'
import ProductGrid from '../components/ProductGrid'

export default function HomePage({ products, productsLoading, onAddToCart }) {
  return (
    <>
      <Hero />
      <main id="shop-section" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-3xl font-bold text-stone-900 mb-8">Shop Essentials</h2>
        <ProductGrid products={products} loading={productsLoading} onAddToCart={onAddToCart} />
      </main>
    </>
  )
}
