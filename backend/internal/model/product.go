package model

import "time"

type Product struct {
	ID        		int       		`json:"id"`
	SKU       		string    		`json:"sku"`
	Name      		string    		`json:"name"`
	Price     		int       		`json:"price"`
	Stock     		int       		`json:"stock"`
	IsActive  		bool      		`json:"is_active"`
	CreatedAt 		time.Time 		`json:"created_at"`
	LastMovementAt 	*time.Time 		`json:"last_movement_at,omitempty"`	
}

type ProductListParams struct {
	Search	string
	Filter	string
	Page	int
	Limit	int
}

type ProductListResult struct {
	Data	[]Product	`json:"data"`
	Page	int			`json:"page"`
	Limit	int			`json:"limit"`
	Total	int			`json:"total"`
}

type CreateProductRequest struct {
	SKU			string	`json:"sku"`
	Name		string	`json:"name"`
	Price		int		`json:"price"`
	Stock		int		`json:"stock"`
}

type UpdateProductRequest struct {
    Name     string `json:"name"`
    Price    int64  `json:"price"`
    IsActive *bool  `json:"is_active"`
}

type ProductSummary struct {
    TotalProducts   int64 `json:"total_products"`
    ActiveProducts  int64 `json:"active_products"`
    TotalStockValue int64 `json:"total_stock_value"`
    LowStockCount   int64 `json:"low_stock_count"`
}
