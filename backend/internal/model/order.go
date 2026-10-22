
package model

import "time"

type CreateOrderItemRequest struct {
    SKU string `json:"sku"`
    Qty int64  `json:"qty"`
}

type CreateOrderRequest struct {
    Customer string                   `json:"customer"`
    Items    []CreateOrderItemRequest `json:"items"`
}

type SalesOrderItem struct {
    ID        int    `json:"id"`
    SKU       string `json:"sku"`
    Qty       int64  `json:"qty"`
    UnitPrice int64  `json:"unit_price"`
}

type SalesOrder struct {
    ID          int              `json:"id"`
    Customer    string           `json:"customer"`
    Status      string           `json:"status"`
    Total       int64            `json:"total"`
    CreatedAt   time.Time        `json:"created_at"`
    CancelledAt *time.Time       `json:"cancelled_at"`
    Items       []SalesOrderItem `json:"items"`
}