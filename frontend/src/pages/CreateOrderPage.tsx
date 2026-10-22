import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, ArrowLeft, CheckCircle, AlertCircle, Loader2, ShoppingCart } from 'lucide-react'

import { productsApi } from '../api/products'
import { ordersApi } from '../api/orders'
import { ApiError } from '../api/errors'

import OrderItemRow from '../components/orders/OrderItemRow'
import type { OrderFormItem } from '../components/orders/OrderItemRow'
import type { Product } from '../types/product'
import type { SalesOrder } from '../types/order'

import { formatRupiah } from '../utils/format'

interface CreateOrderPageProps {
    onOrderCreated: (id: number) => void
    onBack: () => void
}

export default function CreateOrderPage({
    onOrderCreated,
    onBack,
}: CreateOrderPageProps) {
    const [customer, setCustomer] = useState('')
    const [items, setItems] = useState<OrderFormItem[]>([
        { id: 1, sku: '', qty: '1' },
    ])
    const [nextId, setNextId] = useState(2)

    const [products, setProducts] = useState<Product[]>([])
    const [loadingProducts, setLoadingProducts] = useState(true)
    const [productsError, setProductsError] = useState<string | null>(null)
    const [retry, setRetry] = useState(0)

    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [failedSku, setFailedSku] = useState<string | null>(null)
    const [failedAvailable, setFailedAvailable] = useState<number | null>(null)
    const [createdOrder, setCreatedOrder] = useState<SalesOrder | null>(null)

    useEffect(() => {
        const controller = new AbortController()

        async function loadProducts() {
            setLoadingProducts(true)
            setProductsError(null)

            try {
                // Ambil semua halaman, bukan hanya 10 produk pertama.
                const allProducts: Product[] = []
                const limit = 100
                let page = 1
                let total = 0

                do {
                    const response = await productsApi.list(
                        { page, limit, filter: 'active' },
                        controller.signal,
                    )

                    allProducts.push(...response.data)
                    total = response.total
                    page++
                } while (
                    allProducts.length < total &&
                    !controller.signal.aborted
                )

                if (!controller.signal.aborted) {
                    setProducts(allProducts)
                }
            } catch (error: unknown) {
                if (!controller.signal.aborted) {
                    setProductsError(
                        error instanceof Error
                            ? error.message
                            : 'Gagal mengambil daftar produk.',
                    )
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingProducts(false)
                }
            }
        }

        void loadProducts()
        return () => controller.abort()
    }, [retry])

    function addItem() {
        setItems((current) => [
            ...current,
            { id: nextId, sku: '', qty: '1' },
        ])
        setNextId((current) => current + 1)
        setFormError(null)
    }

    function updateItem(
        id: number,
        field: 'sku' | 'qty',
        value: string,
    ) {
        setItems((current) =>
            current.map((item) =>
                item.id === id ? { ...item, [field]: value } : item,
            ),
        )
        setFormError(null)
        setFailedSku(null)
        setFailedAvailable(null)
    }

    function removeItem(id: number) {
        setItems((current) =>
            current.filter((item) => item.id !== id),
        )
    }

    function validate(): string | null {
        if (!customer.trim()) {
            return 'Customer name is required.'
        }

        if (items.length === 0) {
            return 'Add at least one product.'
        }

        const seen = new Set<string>()

        for (const item of items) {
            if (!item.sku) {
                return 'Please select a product for every item.'
            }

            if (seen.has(item.sku)) {
                return `Duplicate SKU: ${item.sku}`
            }
            seen.add(item.sku)

            const qty = Number(item.qty)

            if (
                item.qty.trim() === '' ||
                !Number.isSafeInteger(qty) ||
                qty <= 0 ||
                qty > 2147483647
            ) {
                return `Invalid quantity for ${item.sku}.`
            }
        }

        return null
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (saving || createdOrder) return

        setFormError(null)
        setFailedSku(null)
        setFailedAvailable(null)

        const validationError = validate()

        if (validationError) {
            setFormError(validationError)
            return
        }

        setSaving(true)

        try {
            const order = await ordersApi.create({
                customer: customer.trim(),
                items: items.map((item) => ({
                    sku: item.sku,
                    qty: Number(item.qty),
                })),
            })

            setCreatedOrder(order)
        } catch (error: unknown) {
            if (error instanceof ApiError) {
                if (error.code === 'INSUFFICIENT_STOCK') {
                    setFailedSku(error.sku ?? null)
                    setFailedAvailable(error.available ?? null)

                    setFormError(
                        `Insufficient stock for ${error.sku ?? 'product'}. ` +
                        `Available: ${error.available ?? 'unknown'}.`,
                    )
                } else {
                    setFormError(error.message)
                }
            } else {
                setFormError('Failed to create order.')
            }
        } finally {
            setSaving(false)
        }
    }

    if (createdOrder) {
        return (
            <main className="max-w-xl mx-auto">
                <section className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-8 text-center animate-in fade-in">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200/70">
                        <CheckCircle className="w-8 h-8" />
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 mb-1">Order Created Successfully!</h2>
                    <p className="text-sm text-slate-500 mb-6">Your sales order has been confirmed and stock deducted.</p>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 mb-6 text-left space-y-2.5 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Order ID:</span>
                            <span className="font-semibold text-slate-900">#{createdOrder.id}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Customer:</span>
                            <span className="font-semibold text-slate-900">{createdOrder.customer}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Status:</span>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {createdOrder.status}
                            </span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                            <span className="text-slate-600 font-medium">Grand Total:</span>
                            <span className="text-xl font-bold text-blue-600">{formatRupiah(createdOrder.total)}</span>
                        </div>
                    </div>

                    <p className="text-xs text-slate-400 mb-6">
                        Calculated securely by backend logic.
                    </p>

                    <button
                        type="button"
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs transition-colors"
                        onClick={() => onOrderCreated(createdOrder.id)}
                    >
                        View Order Detail
                    </button>
                </section>
            </main>
        )
    }

    return (
        <main className="max-w-2xl mx-auto">
            <section className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-200/80 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-blue-600" />
                            Create Sales Order
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Record a new customer purchase and allocate inventory
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onBack}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Customer Field */}
                    <div>
                        <label htmlFor="customer-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                            Customer Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            id="customer-name"
                            type="text"
                            value={customer}
                            disabled={saving}
                            onChange={(event) => setCustomer(event.target.value)}
                            placeholder="e.g. John Doe / PT Sumber Makmur"
                            className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400"
                        />
                    </div>

                    {/* Items Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Order Items ({items.length})
                            </label>

                            {!loadingProducts && !productsError && (
                                <button
                                    type="button"
                                    onClick={addItem}
                                    disabled={saving}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add Item
                                </button>
                            )}
                        </div>

                        {loadingProducts && (
                            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2 text-blue-600" />
                                Loading active products catalog...
                            </div>
                        )}

                        {productsError && (
                            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between" role="alert">
                                <span>{productsError}</span>
                                <button
                                    type="button"
                                    onClick={() => setRetry((n) => n + 1)}
                                    className="px-2.5 py-1 bg-white border border-rose-300 rounded text-rose-700 font-semibold"
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {!loadingProducts && !productsError && (
                            <div className="space-y-3">
                                {items.map((item) => (
                                    <OrderItemRow
                                        key={item.id}
                                        item={item}
                                        products={products}
                                        disabled={saving}
                                        error={
                                            failedSku === item.sku
                                                ? `Available stock: ${failedAvailable ?? 'unknown'}`
                                                : undefined
                                        }
                                        onChange={updateItem}
                                        onRemove={removeItem}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Form Error Alert */}
                    {formError && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700 flex items-start gap-2" role="alert">
                            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <span>{formError}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={onBack}
                            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={
                                saving ||
                                loadingProducts ||
                                Boolean(productsError) ||
                                products.length === 0
                            }
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {saving ? 'Creating Order...' : 'Create Order'}
                        </button>
                    </div>
                </form>
            </section>
        </main>
    )
}
