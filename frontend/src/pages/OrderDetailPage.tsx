import { useEffect, useState } from 'react'
import { ArrowLeft, Ban, AlertCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react'

import { ordersApi } from '../api/orders'
import { ApiError } from '../api/errors'
import { formatRupiah } from '../utils/format'

import type { SalesOrder } from '../types/order'

interface OrderDetailPageProps {
    orderId: number
    onBack: () => void
}

export default function OrderDetailPage({
    orderId,
    onBack,
}: OrderDetailPageProps) {
    const [order, setOrder] = useState<SalesOrder | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [retry, setRetry] = useState(0)

    const [cancelling, setCancelling] = useState(false)
    const [cancelError, setCancelError] = useState<string | null>(null)
    const [showConfirm, setShowConfirm] = useState(false)

    useEffect(() => {
        let active = true

        async function loadOrder() {
            setLoading(true)
            setError(null)
            setOrder(null)

            try {
                const data = await ordersApi.detail(orderId)
                if (active) {
                    setOrder(data)
                }
            } catch (err: unknown) {
                if (!active) return

                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to load order.',
                )
            } finally {
                if (active) {
                    setLoading(false)
                }
            }
        }

        void loadOrder()
        return () => {
            active = false
        }
    }, [orderId, retry])

    async function handleCancel() {
        if (!order || order.status !== 'CREATED' || cancelling) {
            return
        }

        setCancelling(true)
        setCancelError(null)

        try {
            const updated = await ordersApi.cancel(order.id)
            setOrder(updated)
            setShowConfirm(false)
        } catch (err: unknown) {
            if (
                err instanceof ApiError &&
                err.code === 'ORDER_ALREADY_CANCELLED'
            ) {
                setCancelError('Pesanan sudah dibatalkan sebelumnya.')
                setShowConfirm(false)
                setRetry((current) => current + 1)
            } else {
                setCancelError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to cancel order.',
                )
            }
        } finally {
            setCancelling(false)
        }
    }

    const formatDate = (date: string) =>
        new Intl.DateTimeFormat('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(date))

    return (
        <main className="max-w-3xl mx-auto space-y-6">
            <section className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-200/80 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                                Order #{orderId}
                            </h2>
                            {order && (
                                <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                        order.status === 'CREATED'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                                            : 'bg-rose-50 text-rose-700 border-rose-200/70'
                                    }`}
                                >
                                    {order.status === 'CREATED' ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                    )}
                                    {order.status}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Detailed sales transaction report</p>
                    </div>

                    <button
                        type="button"
                        onClick={onBack}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back to Products
                    </button>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="p-16 text-center text-sm text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
                        <p>Loading order details...</p>
                    </div>
                )}

                {/* Error State */}
                {!loading && error && (
                    <div className="p-8 text-center">
                        <p className="text-sm font-semibold text-rose-700 mb-3">{error}</p>
                        <button
                            type="button"
                            onClick={() => setRetry((n) => n + 1)}
                            className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Order Content */}
                {!loading && !error && order && (
                    <div className="p-6 space-y-6">
                        {/* Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs">
                            <div>
                                <span className="text-slate-400 font-medium block uppercase tracking-wider text-[10px]">
                                    Customer
                                </span>
                                <strong className="text-slate-900 text-sm mt-0.5 block font-semibold">
                                    {order.customer}
                                </strong>
                            </div>

                            <div>
                                <span className="text-slate-400 font-medium block uppercase tracking-wider text-[10px]">
                                    Status
                                </span>
                                <span className="font-semibold text-slate-900 text-sm mt-0.5 block">
                                    {order.status}
                                </span>
                            </div>

                            <div>
                                <span className="text-slate-400 font-medium block uppercase tracking-wider text-[10px]">
                                    Created At
                                </span>
                                <strong className="text-slate-700 text-xs mt-0.5 block">
                                    {formatDate(order.created_at)}
                                </strong>
                            </div>

                            <div>
                                <span className="text-slate-400 font-medium block uppercase tracking-wider text-[10px]">
                                    Cancelled At
                                </span>
                                <strong className="text-slate-700 text-xs mt-0.5 block">
                                    {order.cancelled_at ? formatDate(order.cancelled_at) : '—'}
                                </strong>
                            </div>
                        </div>

                        {/* Order Items Table */}
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
                                Items Purchased
                            </h3>

                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                            <th className="py-3 px-4">SKU</th>
                                            <th className="py-3 px-4 text-center">Quantity</th>
                                            <th className="py-3 px-4 text-right">Unit Price</th>
                                            <th className="py-3 px-4 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {order.items.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-800">
                                                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded">
                                                        {item.sku}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-center font-medium text-slate-900">
                                                    {item.qty}
                                                </td>
                                                <td className="py-3.5 px-4 text-right text-slate-700">
                                                    {formatRupiah(item.unit_price)}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                                                    {formatRupiah(item.qty * item.unit_price)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Total Highlight */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                            <div>
                                <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                                    Grand Total
                                </span>
                                <p className="text-xs text-slate-400">Total payable amount</p>
                            </div>
                            <strong className="text-2xl font-bold tracking-tight text-blue-600">
                                {formatRupiah(order.total)}
                            </strong>
                        </div>

                        {/* Cancel Error */}
                        {cancelError && (
                            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700 flex items-start gap-2" role="alert">
                                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                <span>{cancelError}</span>
                            </div>
                        )}

                        {/* Actions */}
                        {order.status === 'CREATED' && (
                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    disabled={cancelling}
                                    onClick={() => setShowConfirm(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-rose-50 text-rose-600 font-semibold text-xs rounded-xl border border-rose-200 hover:border-rose-300 shadow-2xs transition-all disabled:opacity-50"
                                >
                                    <Ban className="w-3.5 h-3.5" />
                                    Cancel Order
                                </button>
                            </div>
                        )}

                        {/* Cancelled Notice */}
                        {order.status === 'CANCELLED' && (
                            <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2.5">
                                <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>
                                    This order has been cancelled. All product stocks have been restored by the system.
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* Cancel Confirmation Modal */}
            {showConfirm && order?.status === 'CREATED' && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-100 p-6 space-y-4"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="cancel-title"
                    >
                        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-200/70">
                            <Ban className="w-6 h-6" />
                        </div>

                        <div className="text-center">
                            <h2 id="cancel-title" className="text-lg font-bold text-slate-900">
                                Cancel Order #{order.id}?
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">
                                Are you sure you want to cancel this order? All reserved quantities will be automatically returned to inventory stock.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <button
                                type="button"
                                disabled={cancelling}
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                            >
                                Keep Order
                            </button>

                            <button
                                type="button"
                                disabled={cancelling}
                                onClick={() => void handleCancel()}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                            >
                                {cancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}
