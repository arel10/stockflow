import { ApiError } from './errors'
import type { ApiErrorDetail } from '../types/api'

const BASE_URL = '/api'

function parseApiError(body: unknown): ApiErrorDetail | null {
    if (
        typeof body !== 'object' ||
        body === null ||
        !('error' in body)
    ) {
        return null
    }

    const error = body.error

    if (typeof error !== 'object' || error === null) {
        return null
    }

    if (!('code' in error) || typeof error.code !== 'string') {
        return null
    }

    return {
        code: error.code,
        message:
            'message' in error && typeof error.message === 'string'
                ? error.message
                : undefined,
        sku:
            'sku' in error && typeof error.sku === 'string'
                ? error.sku
                : undefined,
        available:
            'available' in error &&
                typeof error.available === 'number'
                ? error.available
                : undefined,
    }
}

export async function request<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    let response: Response

    try {
        response = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                ...(options.body != null
                    ? { 'Content-Type': 'application/json' }
                    : {}),
                ...options.headers,
            },
        })
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw error
        }

        throw new ApiError(
            0,
            'NETWORK_ERROR',
            'Tidak dapat terhubung ke server. Periksa backend Go.',
        )
    }

    if (response.status === 204) {
        return undefined as T
    }

    let body: unknown

    try {
        body = await response.json()
    } catch {
        throw new ApiError(
            response.status,
            'INVALID_RESPONSE',
            'Server mengembalikan respons yang bukan JSON valid.',
        )
    }

    if (!response.ok) {
        const detail = parseApiError(body)

        throw new ApiError(
            response.status,
            detail?.code ?? 'UNKNOWN_ERROR',
            detail?.message ?? `Request gagal (HTTP ${response.status})`,
            detail?.sku,
            detail?.available,
        )
    }

    return body as T
}
