import { request } from './client'

import type {
    Product,
    ProductListParams,
    ProductListResponse,
    ProductSummary,
    CreateProductRequest,
    UpdateProductRequest,
} from '../types/product'

export const productsApi = {
    list(
        params: ProductListParams = {},
        signal?: AbortSignal,
    ): Promise<ProductListResponse> {
        const query = new URLSearchParams()

        if (params.search) {
            query.set('search', params.search)
        }

        if (params.filter) {
            query.set('filter', params.filter)
        }

        if (params.page !== undefined) {
            query.set('page', String(params.page))
        }

        if (params.limit !== undefined) {
            query.set('limit', String(params.limit))
        }

        const queryString = query.toString()

        const endpoint = queryString
            ? `/products?${queryString}`
            : '/products'

        return request<ProductListResponse>(endpoint, { signal })
    },

    create(data: CreateProductRequest): Promise<Product> {
        return request<Product>('/products', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    },

    update(
        id: number,
        data: UpdateProductRequest,
    ): Promise<Product> {
        return request<Product>(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        })
    },

    remove(id: number): Promise<void> {
        return request<void>(`/products/${id}`, {
            method: 'DELETE',
        })
    },

    summary(signal?: AbortSignal): Promise<ProductSummary> {
        return request<ProductSummary>(
            '/products/summary',
            { signal },
        )
    },

}
