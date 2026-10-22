export class ApiError extends Error {
    constructor(
        public status: number,
        public code: string,
        message: string,
        public sku?: string,
        public available?: number,
    ) {
        super(message)
        this.name = 'ApiError'
    }
}
