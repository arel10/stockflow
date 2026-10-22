export interface ApiErrorDetail {
    code: string
    message?: string
    sku?: string
    available?: number
}

export interface ApiErrorResponse {
    error: ApiErrorDetail
}
