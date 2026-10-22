import { useState } from 'react'
import { Package2, PlusCircle, LayoutList } from 'lucide-react'

import ProductsPage from './pages/ProductsPage'
import CreateOrderPage from './pages/CreateOrderPage'
import OrderDetailPage from './pages/OrderDetailPage'

type Page = 'products' | 'create-order' | 'order-detail'

export default function App() {
  const [page, setPage] = useState<Page>('products')
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)

  function handleOrderCreated(id: number) {
    setSelectedOrderId(id)
    setPage('order-detail')
  }

  function navigateToProducts() {
    setPage('products')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Brand Logo & Name */}
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={navigateToProducts}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Package2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">
                    StockFlow
                  </h1>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <nav className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
              <button
                type="button"
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${page === 'products'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                onClick={navigateToProducts}
              >
                <LayoutList className="w-4 h-4 text-slate-500" />
                Products
              </button>

              <button
                type="button"
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${page === 'create-order'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                onClick={() => setPage('create-order')}
              >
                <PlusCircle className="w-4 h-4" />
                Create Order
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {page === 'products' && <ProductsPage />}

        {page === 'create-order' && (
          <CreateOrderPage
            onOrderCreated={handleOrderCreated}
            onBack={navigateToProducts}
          />
        )}

        {page === 'order-detail' && selectedOrderId !== null && (
          <OrderDetailPage
            orderId={selectedOrderId}
            onBack={navigateToProducts}
          />
        )}
      </div>
    </div>
  )
}
