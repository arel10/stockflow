package repository

import (
	"context"
	"fmt"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"stockflow/internal/model"
)

type ProductRepository struct {
	db *pgxpool.Pool
}

func NewProductRepository(db *pgxpool.Pool) *ProductRepository {
	return &ProductRepository{db: db}
}

func (r *ProductRepository) List(
	ctx context.Context,
	params model.ProductListParams,
) (model.ProductListResult, error) {
	result := model.ProductListResult{
		Data:  make([]model.Product, 0),
		Page:  params.Page,
		Limit: params.Limit,
	}
	// condition search & filter
	where := `
        WHERE (
            $1 = ''
            OR p.sku ILIKE '%' || $1 || '%'
            OR p.name ILIKE '%' || $1 || '%'
        )
        AND (
            $2 = 'all'
            OR ($2 = 'active' AND p.is_active = TRUE)
            OR ($2 = 'inactive' AND p.is_active = FALSE)
            OR ($2 = 'low_stock' AND p.stock <= 10)
        )
    `
	countQuery := `SELECT COUNT(*) FROM products p ` + where
	err := r.db.QueryRow(
		ctx,
		countQuery,
		params.Search,
		params.Filter,
	).Scan(&result.Total)

	if err != nil {
		return result, fmt.Errorf("count products: %w", err)
	}

	offset := (params.Page - 1) * params.Limit

	query := `
        SELECT
            p.id,
            p.sku,
            p.name,
            p.price,
            p.stock,
            p.is_active,
            p.created_at,
            (
                SELECT MAX(sm.created_at)
                FROM stock_movements sm
                WHERE sm.product_id = p.id
            ) AS last_movement_at
        FROM products p
    ` + where + `
        ORDER BY p.id DESC
        LIMIT $3 OFFSET $4
    `

	rows, err := r.db.Query(
		ctx,
		query,
		params.Search,
		params.Filter,
		params.Limit,
		offset,
	)
	if err != nil {
		return result, fmt.Errorf("list products: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var product model.Product

		err := rows.Scan(
			&product.ID,
			&product.SKU,
			&product.Name,
			&product.Price,
			&product.Stock,
			&product.IsActive,
			&product.CreatedAt,
			&product.LastMovementAt,
		)
		if err != nil {
			return result, fmt.Errorf("scan product: %w", err)
		}

		result.Data = append(result.Data, product)
	}

	if err := rows.Err(); err != nil {
		return result, fmt.Errorf("iterate products: %w", err)
	}

	return result, nil
}

func (r *ProductRepository) Create(
	ctx context.Context,
	req model.CreateProductRequest,
) (model.Product, error) {
	var product model.Product

	query := `
		INSERT INTO products (sku, name, price, stock)
		VALUES ($1,$2,$3,$4)
		RETURNING
			id,sku, name, price, stock, is_active, created_at
	`

	err := r.db.QueryRow(
		ctx,
		query,
		req.SKU,
		req.Name,
		req.Price,
		req.Stock,
	).Scan (
		&product.ID,
        &product.SKU,
        &product.Name,
        &product.Price,
        &product.Stock,
        &product.IsActive,
        &product.CreatedAt,
	)

	if err != nil {
		return model.Product{}, err
	}

	return product, nil
}

func (r *ProductRepository) Update(
    ctx context.Context,
    id int,
    req model.UpdateProductRequest,
) (model.Product, error) {
    var product model.Product

    query := `
        UPDATE products
        SET
            name = $2,
            price = $3,
            is_active = $4
        WHERE id = $1
        RETURNING
            id, sku, name, price, stock,
            is_active, created_at
    `

    err := r.db.QueryRow(
        ctx,
        query,
        id,
        req.Name,
        req.Price,
        *req.IsActive,
    ).Scan(
        &product.ID,
        &product.SKU,
        &product.Name,
        &product.Price,
        &product.Stock,
        &product.IsActive,
        &product.CreatedAt,
    )

    if err != nil {
        return model.Product{}, err
    }

    // LastMovementAt not update
    return product, nil
}

var ErrProductHasHistory = errors.New("product has history")

func (r *ProductRepository) Delete(
    ctx context.Context,
    id int,
) error {
    query := `
        DELETE FROM products p
        WHERE p.id = $1
          AND NOT EXISTS (
              SELECT 1
              FROM stock_movements sm
              WHERE sm.product_id = p.id
          )
          AND NOT EXISTS (
              SELECT 1
              FROM sales_order_items soi
              WHERE soi.sku = p.sku
          )
        RETURNING p.id
    `

    var deletedID int

    err := r.db.QueryRow(ctx, query, id).Scan(&deletedID)

    if err == nil {
        return nil
    }

    if !errors.Is(err, pgx.ErrNoRows) {
        var pgErr *pgconn.PgError
        if errors.As(err, &pgErr) && pgErr.Code == "23503" {
            return ErrProductHasHistory
        }
        return err
    }

    var exists bool
    err = r.db.QueryRow(
        ctx,
        `SELECT EXISTS(SELECT 1 FROM products WHERE id = $1)`,
        id,
    ).Scan(&exists)

    if err != nil {
        return err
    }

    if !exists {
        return pgx.ErrNoRows
    }

    return ErrProductHasHistory
}


func (r *ProductRepository) Summary(
    ctx context.Context,
) (model.ProductSummary, error) {
    var summary model.ProductSummary

    query := `
        SELECT
            COUNT(*) AS total_products,

            COUNT(*) FILTER (
                WHERE is_active = TRUE
            ) AS active_products,

            COALESCE(
                SUM(price::bigint * stock::bigint),
                0
            ) AS total_stock_value,

            COUNT(*) FILTER (
                WHERE stock <= 10
            ) AS low_stock_count
        FROM products
    `

    err := r.db.QueryRow(ctx, query).Scan(
        &summary.TotalProducts,
        &summary.ActiveProducts,
        &summary.TotalStockValue,
        &summary.LowStockCount,
    )

    if err != nil {
        return model.ProductSummary{},
            fmt.Errorf("get product summary: %w", err)
    }

    return summary, nil
}