package model

import "time"

type AdjustStockRequest struct {
    Type string `json:"type"`
    Qty  int64  `json:"qty"`
    Note string `json:"note"`
}

type StockMovement struct {
    ID        int       `json:"id"`
    ProductID int       `json:"product_id"`
    Type      string    `json:"type"`
    Qty       int64     `json:"qty"`
    Note      *string   `json:"note"`
    CreatedAt time.Time `json:"created_at"`
}

type AdjustStockResult struct {
    ProductID int           `json:"product_id"`
    SKU       string        `json:"sku"`
    Stock     int64         `json:"stock"`
    Movement  StockMovement `json:"movement"`
}
