export type StockDirection = 'in' | 'out'

export interface StockMovement {
    id: number
    product_id: number
    type: StockDirection
    qty: number
    note: string | null
    created_at: string
}

export interface AdjustStockRequest {
    type: StockDirection
    qty: number
    note: string
}

export interface AdjustStockResponse {
    product_id: number
    sku: string
    stock: number
    movement: StockMovement
}
