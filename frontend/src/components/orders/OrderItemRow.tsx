import { Trash2, AlertCircle } from 'lucide-react'
import type { Product } from '../../types/product'

export interface OrderFormItem {
    id: number
    sku: string
    qty: string
}

interface OrderItemRowProps {
    item: OrderFormItem
    products: Product[]
    disabled: boolean
    error?: string
    onChange: (id: number, field: 'sku' | 'qty', value: string) => void
    onRemove: (id: number) => void
}

export default function OrderItemRow({
    item,
    products,
    disabled,
    error,
    onChange,
    onRemove,
}: OrderItemRowProps) {
    const selectedProduct = products.find(
        (product) => product.sku === item.sku,
    )

    return (
        <div className={`p-4 rounded-xl border transition-all ${
            error ? 'bg-rose-50/50 border-rose-300' : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
        }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
                {/* Product Select */}
                <div className="flex-1 w-full sm:w-auto">
                    <label
                        htmlFor={`sku-${item.id}`}
                        className="block text-xs font-semibold text-slate-600 mb-1"
                    >
                        Product
                    </label>

                    <select
                        id={`sku-${item.id}`}
                        value={item.sku}
                        disabled={disabled}
                        onChange={(event) =>
                            onChange(item.id, 'sku', event.target.value)
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-medium disabled:opacity-50"
                    >
                        <option value="">Select product...</option>
                        {products.map((product) => (
                            <option key={product.id} value={product.sku}>
                                {product.sku} — {product.name} (Stock: {product.stock})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Quantity Input */}
                <div className="w-full sm:w-32">
                    <label
                        htmlFor={`qty-${item.id}`}
                        className="block text-xs font-semibold text-slate-600 mb-1"
                    >
                        Quantity
                    </label>

                    <input
                        id={`qty-${item.id}`}
                        type="number"
                        min="1"
                        max="2147483647"
                        step="1"
                        value={item.qty}
                        disabled={disabled}
                        onChange={(event) =>
                            onChange(item.id, 'qty', event.target.value)
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-medium disabled:opacity-50"
                    />
                </div>

                {/* Remove Button */}
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onRemove(item.id)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors disabled:opacity-50"
                    title="Remove item"
                >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Remove</span>
                </button>
            </div>

            {/* Helper Stock Hint / Price Info */}
            {selectedProduct && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/50 flex items-center justify-between text-xs text-slate-500">
                    <span>
                        Available stock:{' '}
                        <strong className={`font-semibold ${selectedProduct.stock <= 10 ? 'text-amber-600' : 'text-slate-700'}`}>
                            {selectedProduct.stock} units
                        </strong>
                    </span>
                    <span>
                        SKU: <code className="font-mono text-slate-600">{selectedProduct.sku}</code>
                    </span>
                </div>
            )}

            {/* Error banner */}
            {error && (
                <div className="mt-2 text-xs font-medium text-rose-600 flex items-center gap-1.5" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    )
}
