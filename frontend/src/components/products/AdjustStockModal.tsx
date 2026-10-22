import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { X, ArrowDownRight, ArrowUpRight, AlertCircle, Loader2 } from 'lucide-react'

import { stockApi } from '../../api/stock'
import { ApiError } from '../../api/errors'
import type { Product } from '../../types/product'
import type { StockDirection } from '../../types/stock'

interface AdjustStockModalProps {
    product: Product
    onClose: () => void
    onSuccess: () => void
}

export default function AdjustStockModal({
    product,
    onClose,
    onSuccess,
}: AdjustStockModalProps) {
    const [direction, setDirection] = useState<StockDirection>('in')
    const [qty, setQty] = useState('1')
    const [note, setNote] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const quantity = Number(qty)
    const isValidQty =
        qty.trim() !== '' &&
        Number.isSafeInteger(quantity) &&
        quantity > 0 &&
        quantity <= 2147483647

    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape' && !saving) {
                onClose()
            }
        }

        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [onClose, saving])

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!isValidQty || saving) return

        setSaving(true)
        setError(null)

        try {
            await stockApi.adjust(product.id, {
                type: direction,
                qty: quantity,
                note: note.trim(),
            })

            onSuccess()
        } catch (err: unknown) {
            if (
                err instanceof ApiError &&
                err.code === 'INSUFFICIENT_STOCK'
            ) {
                setError(
                    `Stok tidak mencukupi. Stok tersedia: ${
                        err.available ?? 'tidak diketahui'
                    } unit.`,
                )
            } else if (err instanceof Error) {
                setError(err.message)
            } else {
                setError('Gagal menyesuaikan stok.')
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !saving) {
                    onClose()
                }
            }}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 p-6 relative overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-labelledby="adjust-stock-title"
            >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                        <h2 id="adjust-stock-title" className="text-lg font-bold text-slate-900 tracking-tight">
                            Adjust Stock
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Update inventory levels for this item
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Product Detail Info Banner */}
                <div className="my-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
                    <div>
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700">
                            {product.sku}
                        </span>
                        <p className="text-sm font-semibold text-slate-900 mt-1">{product.name}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider block">
                            Current Stock
                        </span>
                        <span className="text-base font-bold text-slate-900">
                            {product.stock.toLocaleString('id-ID')}
                        </span>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="stock-direction" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                            Adjustment Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setDirection('in')}
                                disabled={saving}
                                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-sm font-semibold transition-all ${
                                    direction === 'in'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                                Stock In (+)
                            </button>

                            <button
                                type="button"
                                onClick={() => setDirection('out')}
                                disabled={saving}
                                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-sm font-semibold transition-all ${
                                    direction === 'out'
                                        ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500/20'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <ArrowDownRight className="w-4 h-4 text-rose-600" />
                                Stock Out (-)
                            </button>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="stock-qty" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                            Quantity
                        </label>
                        <input
                            id="stock-qty"
                            type="number"
                            min="1"
                            max="2147483647"
                            step="1"
                            required
                            value={qty}
                            onChange={(event) => setQty(event.target.value)}
                            disabled={saving}
                            className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
                        />
                    </div>

                    <div>
                        <label htmlFor="stock-note" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                            Reason / Note
                        </label>
                        <textarea
                            id="stock-note"
                            rows={3}
                            maxLength={1000}
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            disabled={saving}
                            placeholder="Reason for this stock adjustment (optional)..."
                            className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 resize-none placeholder:text-slate-400"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700 flex items-start gap-2" role="alert">
                            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={!isValidQty || saving}
                            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {saving ? 'Saving...' : 'Save Adjustment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
