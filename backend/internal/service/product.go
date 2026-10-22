package service

import (
	"context"
	"strings"
	"errors"
	"fmt"

	"stockflow/internal/model"
    "stockflow/internal/repository"
)

type ProductService struct {
	repo *repository.ProductRepository
}

func NewProductService(
	repo *repository.ProductRepository,
) *ProductService {
	return &ProductService{repo: repo}
}

func (s *ProductService) List(
	ctx context.Context,
	params model.ProductListParams,
) (model.ProductListResult, error) {
	// normalize filters
	if params.Search != "" {
		params.Search = strings.TrimSpace(params.Search)
	}

	if params.Filter == "" {
		params.Filter = "all"
	}

	if params.Page < 1 {
		params.Page = 1
	}
	if params.Limit > 100 {
		params.Limit = 100 
	}
	return s.repo.List(ctx, params)
}

var (
	ErrInvalidSKU = errors.New("sku is requierd")
	ErrInvalidName = errors.New("name is requierd")
	ErrInvalidPrice = errors.New("price must be non-negative")
	ErrInvalidStock = errors.New("stock must be non-negative")
)

func (s *ProductService) Create(
	ctx context.Context,
	req model.CreateProductRequest,
) (model.Product, error) {
	req.SKU = strings.TrimSpace(req.SKU)
	req.Name = strings.TrimSpace(req.Name)

	if req.SKU == ""{
		return model.Product{}, ErrInvalidSKU
	}

	if req.Name == ""{
		return model.Product{}, ErrInvalidName
	}
	
	if req.Price < 0 || req.Price > 2147483647 {
        return model.Product{}, ErrInvalidPrice
    }

    if req.Stock < 0 || int64(req.Stock) > 2147483647 {
        return model.Product{}, ErrInvalidStock
    }

    return s.repo.Create(ctx, req)
}

func (s *ProductService) Update(
    ctx context.Context,
    id int,
    req model.UpdateProductRequest,
) (model.Product, error) {
    if id <= 0 {
        return model.Product{}, fmt.Errorf("invalid product id")
    }

    req.Name = strings.TrimSpace(req.Name)

    if req.Name == "" {
        return model.Product{}, ErrInvalidName
    }

    if req.Price < 0 || req.Price > 2147483647 {
        return model.Product{}, ErrInvalidPrice
    }

    if req.IsActive == nil {
        return model.Product{}, fmt.Errorf("is_active is required")
    }

    return s.repo.Update(ctx, id, req)
}

var ErrInvalidProductID = errors.New("invalid product id")

func (s *ProductService) Delete(
    ctx context.Context,
    id int,
) error {
    if id <= 0 {
        return ErrInvalidProductID
    }
    return s.repo.Delete(ctx, id)
}

func (s *ProductService) Summary(
    ctx context.Context,
) (model.ProductSummary, error) {
    return s.repo.Summary(ctx)
}
