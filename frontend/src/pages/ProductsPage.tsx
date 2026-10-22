import { useEffect, useState } from 'react'
import { Search, Filter, ChevronLeft, ChevronRight, RefreshCw, PackageX } from 'lucide-react'

import { productsApi } from '../api/products'
import { ApiError } from '../api/errors'
import ProductsTable from '../components/products/ProductTable'
import AdjustStockModal from '../components/products/AdjustStockModal'
import SummaryCards from '../components/dashboard/SummaryCard'

import type {
    Product,
    ProductFilter,
    ProductSummary,
} from '../types/product'

const PAGE_SIZE = 10

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [filter, setFilter] = useState<ProductFilter>('all')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [retry, setRetry] = useState(0)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [summary, setSummary] = useState<ProductSummary | null>(null)
    const [summaryLoading, setSummaryLoading] = useState(true)
    const [summaryError, setSummaryError] = useState<string | null>(null)
    const [summaryRetry, setSummaryRetry] = useState(0)

    // Debounce pencarian selama 300 ms.
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(search)
            setPage(1)
        }, 300)

        return () => window.clearTimeout(timer)
    }, [search])

    // Ambil produk setiap parameter berubah.
    useEffect(() => {
        const controller = new AbortController()

        async function loadProducts() {
            setLoading(true)
            setError(null)

            try {
                const result = await productsApi.list(
                    {
                        search: debouncedSearch,
                        filter,
                        page,
                        limit: PAGE_SIZE,
                    },
                    controller.signal,
                )

                if (!controller.signal.aborted) {
                    setProducts(result.data)
                    setTotal(result.total)
                }
            } catch (err: unknown) {
                if (controller.signal.aborted) return

                setError(
                    err instanceof ApiError
                        ? err.message
                        : 'Gagal mengambil data produk.',
                )
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false)
                }
            }
        }

        void loadProducts()
        return () => controller.abort()
    }, [debouncedSearch, filter, page, retry])

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    function handleFilterChange(value: ProductFilter) {
        setFilter(value)
        setPage(1)
    }

    function handleAdjustSuccess() {
        setSelectedProduct(null)
        setRetry((current) => current + 1)
        setSummaryRetry((current) => current + 1)
    }

    useEffect(() => {
        const controller = new AbortController()

        async function loadSummary() {
            setSummaryLoading(true)
            setSummaryError(null)

            try {
                const result = await productsApi.summary(
                    controller.signal,
                )

                if (!controller.signal.aborted) {
                    setSummary(result)
                }
            } catch (err: unknown) {
                if (controller.signal.aborted) return

                setSummaryError(
                    err instanceof Error
                        ? err.message
                        : 'Gagal mengambil ringkasan inventory.',
                )
            } finally {
                if (!controller.signal.aborted) {
                    setSummaryLoading(false)
                }
            }
        }

        void loadSummary()

        return () => controller.abort()
    }, [summaryRetry])

    return (
        <main className="space-y-6">
            <SummaryCards
                summary={summary}
                loading={summaryLoading}
                error={summaryError}
                onRetry={() => setSummaryRetry((current) => current + 1)}
            />

            {/* Products Card Section */}
            <section className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                {/* Section Header & Filters */}
                <div className="p-5 border-b border-slate-200/80">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Products</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Manage and monitor your inventory products</p>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    aria-label="Search products"
                                    type="search"
                                    placeholder="Search SKU or name..."
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400"
                                />
                            </div>

                            <div className="relative">
                                <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <select
                                    aria-label="Filter products"
                                    value={filter}
                                    onChange={(event) => handleFilterChange(event.target.value as ProductFilter)}
                                    className="pl-8 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 font-medium cursor-pointer"
                                >
                                    <option value="all">All Products</option>
                                    <option value="active">Active Only</option>
                                    <option value="inactive">Inactive Only</option>
                                    <option value="low_stock">Low Stock (≤ 10)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* State Messages & Table */}
                {loading ? (
                    <div className="p-12 text-center text-sm text-slate-500">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-blue-600 mb-3" />
                        <p>Loading products catalog...</p>
                    </div>
                ) : error ? (
                    <div className="p-10 text-center">
                        <div className="inline-flex p-3 rounded-full bg-rose-50 text-rose-600 mb-3">
                            <RefreshCw className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-semibold text-rose-800 mb-1">{error}</p>
                        <p className="text-xs text-slate-500 mb-4">Please check your connection and try again</p>
                        <button
                            type="button"
                            onClick={() => setRetry((n) => n + 1)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 shadow-xs transition-colors"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Retry
                        </button>
                    </div>
                ) : products.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="inline-flex p-3 rounded-full bg-slate-100 text-slate-400 mb-3">
                            <PackageX className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 mb-1">No products found</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            {search
                                ? `No matches found for "${search}". Try adjusting your keywords or filter.`
                                : 'There are no products available in the selected filter.'}
                        </p>
                    </div>
                ) : (
                    <ProductsTable
                        products={products}
                        onAdjustStock={setSelectedProduct}
                    />
                )}

                {/* Pagination Footer */}
                {!loading && !error && total > 0 && (
                    <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                        <span>
                            Showing page <strong className="text-slate-900">{page}</strong> of{' '}
                            <strong className="text-slate-900">{totalPages}</strong> ({total} total products)
                        </span>

                        <div className="inline-flex items-center gap-2">
                            <button
                                type="button"
                                disabled={page <= 1}
                                onClick={() => setPage((n) => n - 1)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-all"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                                Previous
                            </button>

                            <button
                                type="button"
                                disabled={page >= totalPages}
                                onClick={() => setPage((n) => n + 1)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-all"
                            >
                                Next
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* Adjust Stock Modal */}
            {selectedProduct && (
                <AdjustStockModal
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                    onSuccess={handleAdjustSuccess}
                />
            )}
        </main>
    )
}
