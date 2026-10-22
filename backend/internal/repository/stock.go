package repository

import (
	"context"
    "errors"
    "fmt"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"

    "stockflow/internal/model"
)

var ErrInsufficientStock = errors.New("insufficient stock")

type StockRepository struct {
	db *pgxpool.Pool
}

func NewStockRepository(db *pgxpool.Pool) *StockRepository {
	return &StockRepository{db: db}
}

type StockConflict struct {
	Available int64
}

func (e *StockConflict) Error() string {
	return "insufficient stock"
}

var ErrStockOverflow = errors.New("stock exceeds maximum value")

func (r *StockRepository) Adjust(
    ctx context.Context,
    productID int,
    req model.AdjustStockRequest,
) (model.AdjustStockResult, error) {
    var result model.AdjustStockResult

    tx, err := r.db.Begin(ctx)
    if err != nil {
        return result, fmt.Errorf("begin transaction: %w", err)
    }
    defer tx.Rollback(ctx)

    var stock int64
    var sku string

    // Decrease stock if enough.
    // Prevent INTEGER overflow.
    query := `
        UPDATE products
        SET stock = CASE
            WHEN $2 = 'in' THEN stock + $3::bigint
            ELSE stock - $3::bigint
        END
        WHERE id = $1
          AND (
            ($2 = 'out' AND stock >= $3)
            OR ($2 = 'in' AND stock::bigint + $3 <= 2147483647)
          )
        RETURNING sku, stock
    `

    err = tx.QueryRow(
        ctx, query, productID, req.Type, req.Qty,
    ).Scan(&sku, &stock)

    if errors.Is(err, pgx.ErrNoRows) {
        var exists bool

        err = tx.QueryRow(ctx,
            `SELECT EXISTS(
                SELECT 1 FROM products WHERE id = $1
            )`,
            productID,
        ).Scan(&exists)

        if err != nil {
            return result, err
        }

        if !exists {
            return result, pgx.ErrNoRows
        }

        if req.Type == "out" {
            var available int64
            err = tx.QueryRow(ctx,
                `SELECT stock FROM products WHERE id = $1`,
                productID,
            ).Scan(&available)

            if err != nil {
                return result, err
            }

            return result, &StockConflict{Available: available}
        }

        return result, ErrStockOverflow
    }

    if err != nil {
        return result, fmt.Errorf("update stock: %w", err)
    }

    var movement model.StockMovement
    var note *string
    if req.Note != "" {
        note = &req.Note
    }

    err = tx.QueryRow(ctx, `
        INSERT INTO stock_movements
            (product_id, type, qty, note)
        VALUES ($1, $2, $3, $4)
        RETURNING id, product_id, type, qty, note, created_at
    `, productID, req.Type, req.Qty, note).Scan(
        &movement.ID,
        &movement.ProductID,
        &movement.Type,
        &movement.Qty,
        &movement.Note,
        &movement.CreatedAt,
    )

    if err != nil {
        return result, fmt.Errorf("insert stock movement: %w", err)
    }

    if err := tx.Commit(ctx); err != nil {
        return result, fmt.Errorf("commit transaction: %w", err)
    }

    result.ProductID = productID
    result.SKU = sku
    result.Stock = stock
    result.Movement = movement

    return result, nil
}

func (r *StockRepository) Movements(
    ctx context.Context,
    productID int,
) ([]model.StockMovement, error) {
    var exists bool

    err := r.db.QueryRow(ctx, `
        SELECT EXISTS(
            SELECT 1 FROM products WHERE id = $1
        )
    `, productID).Scan(&exists)

    if err != nil {
        return nil, fmt.Errorf("check product: %w", err)
    }

    if !exists {
        return nil, pgx.ErrNoRows
    }

    rows, err := r.db.Query(ctx, `
        SELECT id, product_id, type, qty, note, created_at
        FROM stock_movements
        WHERE product_id = $1
        ORDER BY created_at DESC, id DESC
    `, productID)

    if err != nil {
        return nil, fmt.Errorf("query movements: %w", err)
    }
    defer rows.Close()

    movements := make([]model.StockMovement, 0)

    for rows.Next() {
        var movement model.StockMovement

        err := rows.Scan(
            &movement.ID,
            &movement.ProductID,
            &movement.Type,
            &movement.Qty,
            &movement.Note,
            &movement.CreatedAt,
        )

        if err != nil {
            return nil, fmt.Errorf("scan movement: %w", err)
        }

        movements = append(movements, movement)
    }

    if err := rows.Err(); err != nil {
        return nil, fmt.Errorf("iterate movements: %w", err)
    }

    return movements, nil
}
