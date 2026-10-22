
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
    ErrInvalidStockType = errors.New("type must be in or out")
    ErrInvalidStockQty  = errors.New("qty must be a positive integer")
	ErrStockNoteTooLong = errors.New("note must be at most 1000 bytes")
)

type StockService struct {
    repo *repository.StockRepository
}

func NewStockService(
    repo *repository.StockRepository,
) *StockService {
    return &StockService{repo: repo}
}

func (s *StockService) Adjust(
    ctx context.Context,
    productID int,
    req model.AdjustStockRequest,
) (model.AdjustStockResult, error) {
    if productID <= 0 {
        return model.AdjustStockResult{}, ErrInvalidProductID
    }

    if req.Type != "in" && req.Type != "out" {
        return model.AdjustStockResult{}, ErrInvalidStockType
    }

    if req.Qty <= 0 || req.Qty > math.MaxInt32 {
        return model.AdjustStockResult{}, ErrInvalidStockQty
    }

    req.Note = strings.TrimSpace(req.Note)

    if len(req.Note) > 1000 {
        return model.AdjustStockResult{},
            ErrStockNoteTooLong
    }

    return s.repo.Adjust(ctx, productID, req)
}

func (s *StockService) Movements(
    ctx context.Context,
    productID int,
) ([]model.StockMovement, error) {
    if productID <= 0 {
        return nil, ErrInvalidProductID
    }

    return s.repo.Movements(ctx, productID)
}