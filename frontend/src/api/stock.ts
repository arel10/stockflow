import { request } from './client'

import type {
    AdjustStockRequest,
    AdjustStockResponse,
    StockMovement,
} from '../types/stock'

export const stockApi = {
    adjust(
        productId: number,
        data: AdjustStockRequest,
    ): Promise<AdjustStockResponse> {
        return request<AdjustStockResponse>(
            `/products/${productId}/stock`,
            {
                method: 'POST',
                body: JSON.stringify(data),
            },
        )
    },

    movements(productId: number): Promise<StockMovement[]> {
        return request<StockMovement[]>(
            `/products/${productId}/movements`,
        )
    },
}
