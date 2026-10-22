
export interface CreateOrderItemRequest {
    sku: string
    qty: number
}

export interface CreateOrderRequest {
    customer: string
    items: CreateOrderItemRequest[]
}

export interface SalesOrderItem {
    id: number
    sku: string
    qty: number
    unit_price: number
}

export type OrderStatus = 'CREATED' | 'CANCELLED'

export interface SalesOrder {
    id: number
    customer: string
    status: OrderStatus
    total: number
    created_at: string
    cancelled_at: string | null
    items: SalesOrderItem[]
}
