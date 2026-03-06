import Hero from '../components/Hero'
import ProductGrid from '../components/ProductGrid'

export default function HomePage({ products, productsLoading, onAddToCart }) {
  return (
    <>
      <Hero />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-2xl font-semibold text-stone-800 mb-6">Shop</h2>
        <ProductGrid products={products} loading={productsLoading} onAddToCart={onAddToCart} />
      </main>
    </>
  )
}
