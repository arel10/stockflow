import { request } from './client'
import type {
    CreateOrderRequest,
    SalesOrder,
} from '../types/order'

export const ordersApi = {
    create(data: CreateOrderRequest) {
        return request<SalesOrder>('/orders', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    },

    detail(id: number) {
        return request<SalesOrder>(`/orders/${id}`)
    },

    cancel(id: number) {
        return request<SalesOrder>(
            `/orders/${id}/cancel`,
            { method: 'POST' },
        )
    },
}
