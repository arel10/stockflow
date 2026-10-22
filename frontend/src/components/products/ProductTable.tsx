import { ArrowUpDown, AlertCircle } from 'lucide-react'
import type { Product } from '../../types/product'
import { formatRupiah, timeAgo } from '../../utils/format'

interface ProductsTableProps {
    products: Product[]
    onAdjustStock: (product: Product) => void
}

export default function ProductsTable({
    products,
    onAdjustStock,
}: ProductsTableProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
                <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th scope="col" className="py-3.5 px-6">SKU</th>
                        <th scope="col" className="py-3.5 px-6">Product Name</th>
                        <th scope="col" className="py-3.5 px-6">Price</th>
                        <th scope="col" className="py-3.5 px-6">Stock</th>
                        <th scope="col" className="py-3.5 px-6">Status</th>
                        <th scope="col" className="py-3.5 px-6">Last Movement</th>
                        <th scope="col" className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                    {products.map((product) => {
                        const isLowStock = product.stock <= 10

                        return (
                            <tr
                                key={product.id}
                                className="hover:bg-slate-50/70 transition-colors group"
                            >
                                <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                                    <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-200/60">
                                        {product.sku}
                                    </span>
                                </td>

                                <td className="py-4 px-6 font-medium text-slate-900">
                                    {product.name}
                                </td>

                                <td className="py-4 px-6 font-semibold text-slate-900 whitespace-nowrap">
                                    {formatRupiah(product.price)}
                                </td>

                                <td className="py-4 px-6 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-semibold ${isLowStock ? 'text-amber-700 font-bold' : 'text-slate-900'}`}>
                                            {product.stock.toLocaleString('id-ID')}
                                        </span>
                                        {isLowStock && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/70 px-1.5 py-0.5 rounded-full">
                                                <AlertCircle className="w-3 h-3" />
                                                Low
                                            </span>
                                        )}
                                    </div>
                                </td>

                                <td className="py-4 px-6 whitespace-nowrap">
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                            product.is_active
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                                                : 'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}
                                    >
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full ${
                                                product.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                                            }`}
                                        />
                                        {product.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>

                                <td className="py-4 px-6 text-xs text-slate-500 whitespace-nowrap">
                                    {timeAgo(product.last_movement_at)}
                                </td>

                                <td className="py-4 px-6 text-right whitespace-nowrap">
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-blue-700 bg-blue-50/70 hover:bg-blue-100 border border-blue-200/70 transition-all shadow-2xs hover:shadow-xs"
                                        onClick={() => onAdjustStock(product)}
                                    >
                                        <ArrowUpDown className="w-3 h-3" />
                                        Adjust Stock
                                    </button>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
