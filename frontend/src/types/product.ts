export interface Product {
    id: number
    sku: string
    name: string
    price: number
    stock: number
    is_active: boolean
    created_at: string
    last_movement_at: string | null
}

export type ProductFilter =
    | 'all'
    | 'active'
    | 'inactive'
    | 'low_stock'

export interface ProductListParams {
    search?: string
    filter?: ProductFilter
    page?: number
    limit?: number
}

export interface ProductListResponse {
    data: Product[]
    page: number
    limit: number
    total: number
}

export interface CreateProductRequest {
    sku: string
    name: string
    price: number
    stock: number
}

export interface UpdateProductRequest {
    name: string
    price: number
    is_active: boolean
}

export interface ProductSummary {
    total_products: number
    active_products: number
    total_stock_value: number
    low_stock_count: number
}
