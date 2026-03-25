export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-stone-100 text-stone-900 border-b border-stone-200">
      <div className="absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(0,0,0,0.03),transparent_50%)]" />
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 flex flex-col items-center text-center">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-stone-900 leading-tight max-w-3xl">
          The ultimate setup <br className="hidden sm:block" /> for modern creators.
        </h1>
        
        <p className="mt-6 text-xl text-stone-600 max-w-2xl font-light">
          Discover our premium collection of precise keyboards, ergonomic peripherals, and minimalist accessories.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center">
          <button 
            onClick={() => document.getElementById('shop-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-3.5 rounded-full bg-stone-900 text-white font-medium hover:bg-stone-800 transition-colors shadow-sm"
          >
            Explore Collection
          </button>
        </div>
      </div>
    </section>
  )
}
