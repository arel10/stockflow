import { Package, CheckCircle2, DollarSign, AlertTriangle, RefreshCw } from 'lucide-react'
import type { ProductSummary } from '../../types/product'
import { formatRupiah } from '../../utils/format'

interface SummaryCardsProps {
    summary: ProductSummary | null
    loading: boolean
    error: string | null
    onRetry: () => void
}

export default function SummaryCards({
    summary,
    loading,
    error,
    onRetry,
}: SummaryCardsProps) {
    if (loading) {
        return (
            <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Inventory Overview</h2>
                        <p className="text-xs text-slate-500">Real-time inventory summary</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs animate-pulse"
                        >
                            <div className="h-4 bg-slate-200 rounded w-1/2 mb-3"></div>
                            <div className="h-7 bg-slate-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                        </div>
                    ))}
                </div>
            </section>
        )
    }

    if (error) {
        return (
            <section className="mb-8">
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
                    <p className="text-sm font-medium text-rose-800 mb-3">{error}</p>
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-rose-700 text-xs font-semibold rounded-lg border border-rose-300 hover:bg-rose-100/50 shadow-xs transition-colors"
                        onClick={onRetry}
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Retry Summary
                    </button>
                </div>
            </section>
        )
    }

    if (!summary) return null

    const cards = [
        {
            label: 'Total Products',
            value: summary.total_products.toLocaleString('id-ID'),
            description: 'All registered catalog items',
            icon: Package,
            iconBg: 'bg-blue-50 text-blue-600 border-blue-200/70',
        },
        {
            label: 'Active Products',
            value: summary.active_products.toLocaleString('id-ID'),
            description: 'Currently sellable items',
            icon: CheckCircle2,
            iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/70',
        },
        {
            label: 'Total Stock Value',
            value: formatRupiah(summary.total_stock_value),
            description: 'Total inventory asset value',
            icon: DollarSign,
            iconBg: 'bg-violet-50 text-violet-600 border-violet-200/70',
        },
        {
            label: 'Low Stock Alert',
            value: summary.low_stock_count.toLocaleString('id-ID'),
            description: 'Products with stock ≤ 10 units',
            icon: AlertTriangle,
            iconBg: 'bg-amber-50 text-amber-600 border-amber-200/70',
        },
    ]

    return (
        <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Inventory Overview</h2>
                    <p className="text-xs text-slate-500">Real-time inventory metrics & value</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card) => {
                    const Icon = card.icon
                    return (
                        <div
                            key={card.label}
                            className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all group flex flex-col justify-between"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        {card.label}
                                    </p>
                                    <h3 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                                        {card.value}
                                    </h3>
                                </div>
                                <div
                                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${card.iconBg} group-hover:scale-105 transition-transform`}
                                >
                                    <Icon className="w-5 h-5" />
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100">
                                {card.description}
                            </p>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}
