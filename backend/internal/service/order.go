package service

import (
    "context"
    "errors"
    "math"
    "strings"

    "stockflow/internal/model"
    "stockflow/internal/repository"
)

var (
    ErrInvalidOrder = errors.New("invalid order")
)

type OrderService struct {
	repo *repository.OrderRepository
}

func NewOrderService(
	repo *repository.OrderRepository,
) *OrderService {
	return &OrderService{repo: repo}
}

func (s *OrderService) Create(
    ctx context.Context,
    req model.CreateOrderRequest,
) (model.SalesOrder, error) {
    req.Customer = strings.TrimSpace(req.Customer)

    if req.Customer == "" {
        return model.SalesOrder{},
            &repository.OrderValidationError{
                Message: "customer is required",
            }
    }

    if len(req.Items) == 0 {
        return model.SalesOrder{},
            &repository.OrderValidationError{
                Message: "items cannot be empty",
            }
    }

    seen := make(map[string]bool)

    for i := range req.Items {
        item := &req.Items[i]
        item.SKU = strings.TrimSpace(item.SKU)

        if item.SKU == "" {
            return model.SalesOrder{},
                &repository.OrderValidationError{
                    Message: "item sku is required",
                }
        }

        if item.Qty <= 0 || item.Qty > math.MaxInt32 {
            return model.SalesOrder{},
                &repository.OrderValidationError{
                    Message: "qty must be a positive integer within INTEGER range",
                }
        }

        if seen[item.SKU] {
            return model.SalesOrder{},
                &repository.OrderValidationError{
                    Message: "duplicate sku: " + item.SKU,
                }
        }

        seen[item.SKU] = true
    }

    return s.repo.Create(ctx, req)
}

func (s *OrderService) Detail(
    ctx context.Context,
    id int,
) (model.SalesOrder, error) {
    if id <= 0 {
        return model.SalesOrder{}, ErrInvalidOrder
    }

    return s.repo.Detail(ctx, id)
}

func (s *OrderService) Cancel(
    ctx context.Context,
    id int,
) (model.SalesOrder, error) {
    if id <= 0 {
        return model.SalesOrder{}, ErrInvalidOrder
    }

    return s.repo.Cancel(ctx, id)
}