
package repository

import (
    "context"
    "errors"
    "fmt"
    "math"
    "sort"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"

    "stockflow/internal/model"
)

type OrderRepository struct {
    db *pgxpool.Pool
}

func NewOrderRepository(db *pgxpool.Pool) *OrderRepository {
    return &OrderRepository{db: db}
}

type OrderValidationError struct {
    Message string
}

func (e *OrderValidationError) Error() string {
    return e.Message
}

type OrderStockConflict struct {
    SKU       string
    Available int64
}

func (e *OrderStockConflict) Error() string {
    return "insufficient stock for " + e.SKU
}

var ErrOrderAlreadyCancelled = errors.New("order already cancelled")
var ErrOrderTotalOverflow = errors.New("order total exceeds INTEGER range")
var ErrStockRestoreOverflow = errors.New("restoring stock exceeds INTEGER range")

type pricedOrderItem struct {
    SKU       string
    Qty       int64
    UnitPrice int64
}

func (r *OrderRepository) Create(
    ctx context.Context,
    req model.CreateOrderRequest,
) (model.SalesOrder, error) {
    var order model.SalesOrder

    tx, err := r.db.Begin(ctx)
    if err != nil {
        return order, fmt.Errorf("begin order transaction: %w", err)
    }
    defer tx.Rollback(ctx)

    // sort SKU for consistent locking
    items := append([]model.CreateOrderItemRequest(nil), req.Items...)
    sort.Slice(items, func(i, j int) bool {
        return items[i].SKU < items[j].SKU
    })

    priced := make([]pricedOrderItem, 0, len(items))
    var total int64

    // validate all SKU and stock before writing
    for _, item := range items {
        var price int64
        var available int64

        err := tx.QueryRow(ctx, `
            SELECT price, stock
            FROM products
            WHERE sku = $1
            FOR UPDATE
        `, item.SKU).Scan(&price, &available)

        if errors.Is(err, pgx.ErrNoRows) {
            return order, &OrderValidationError{
                Message: "unknown sku: " + item.SKU,
            }
        }
        if err != nil {
            return order, fmt.Errorf("lookup product %s: %w", item.SKU, err)
        }

        if available < item.Qty {
            return order, &OrderStockConflict{
                SKU: item.SKU, Available: available,
            }
        }

        // Check total overflow before multiplication and summation
        if price > (math.MaxInt32-total)/item.Qty {
            return order, ErrOrderTotalOverflow
        }

        total += price * item.Qty

        priced = append(priced, pricedOrderItem{
            SKU:       item.SKU,
            Qty:       item.Qty,
            UnitPrice: price,
        })
    }

    // reduce stock using a guard in the UPDATE
    for _, item := range priced {
        var newStock int64

        err := tx.QueryRow(ctx, `
            UPDATE products
            SET stock = stock - $2
            WHERE sku = $1 AND stock >= $2
            RETURNING stock
        `, item.SKU, item.Qty).Scan(&newStock)

        if errors.Is(err, pgx.ErrNoRows) {
            var available int64
            scanErr := tx.QueryRow(ctx, `
                SELECT stock FROM products WHERE sku = $1
            `, item.SKU).Scan(&available)

            if scanErr != nil {
                return order, scanErr
            }

            return order, &OrderStockConflict{
                SKU: item.SKU, Available: available,
            }
        }
        if err != nil {
            return order, fmt.Errorf("decrement %s: %w", item.SKU, err)
        }
    }

    // save order header
    err = tx.QueryRow(ctx, `
        INSERT INTO sales_orders (customer, total)
        VALUES ($1, $2)
        RETURNING id, customer, status, total,
                  created_at, cancelled_at
    `, req.Customer, total).Scan(
        &order.ID,
        &order.Customer,
        &order.Status,
        &order.Total,
        &order.CreatedAt,
        &order.CancelledAt,
    )
    if err != nil {
        return order, fmt.Errorf("insert order: %w", err)
    }

    order.Items = make([]model.SalesOrderItem, 0, len(priced))

    // save all order items and stock movements
    for _, item := range priced {
        var saved model.SalesOrderItem

        err = tx.QueryRow(ctx, `
            INSERT INTO sales_order_items
                (order_id, sku, qty, unit_price)
            VALUES ($1, $2, $3, $4)
            RETURNING id, sku, qty, unit_price
        `, order.ID, item.SKU, item.Qty, item.UnitPrice).Scan(
            &saved.ID,
            &saved.SKU,
            &saved.Qty,
            &saved.UnitPrice,
        )
        if err != nil {
            return order, fmt.Errorf("insert order item: %w", err)
        }

        _, err = tx.Exec(ctx, `
            INSERT INTO stock_movements
                (product_id, type, qty, note)
            SELECT id, 'out', $2, $3
            FROM products
            WHERE sku = $1
        `, item.SKU, item.Qty,
            fmt.Sprintf("Sales order #%d", order.ID))

        if err != nil {
            return order, fmt.Errorf("insert order movement: %w", err)
        }

        order.Items = append(order.Items, saved)
    }

    // commit
    if err := tx.Commit(ctx); err != nil {
        return model.SalesOrder{},
            fmt.Errorf("commit order: %w", err)
    }

    return order, nil
}

func (r *OrderRepository) Detail(
    ctx context.Context,
    id int,
) (model.SalesOrder, error) {
    var order model.SalesOrder

    err := r.db.QueryRow(ctx, `
        SELECT id, customer, status, total,
               created_at, cancelled_at
        FROM sales_orders
        WHERE id = $1
    `, id).Scan(
        &order.ID,
        &order.Customer,
        &order.Status,
        &order.Total,
        &order.CreatedAt,
        &order.CancelledAt,
    )
    if err != nil {
        return order, err
    }

    rows, err := r.db.Query(ctx, `
        SELECT id, sku, qty, unit_price
        FROM sales_order_items
        WHERE order_id = $1
        ORDER BY id
    `, id)
    if err != nil {
        return order, err
    }
    defer rows.Close()

    order.Items = make([]model.SalesOrderItem, 0)

    for rows.Next() {
        var item model.SalesOrderItem

        if err := rows.Scan(
            &item.ID,
            &item.SKU,
            &item.Qty,
            &item.UnitPrice,
        ); err != nil {
            return order, err
        }

        order.Items = append(order.Items, item)
    }

    if err := rows.Err(); err != nil {
        return order, err
    }

    return order, nil
}

func (r *OrderRepository) Cancel(
    ctx context.Context,
    id int,
) (model.SalesOrder, error) {
    var result model.SalesOrder

    tx, err := r.db.Begin(ctx)
    if err != nil {
        return result, err
    }
    defer tx.Rollback(ctx)

    var status string

    // lock order for preventing duplicate cancellation
    err = tx.QueryRow(ctx, `
        SELECT status
        FROM sales_orders
        WHERE id = $1
        FOR UPDATE
    `, id).Scan(&status)

    if err != nil {
        return result, err
    }

    if status == "CANCELLED" {
        return result, ErrOrderAlreadyCancelled
    }

    // get all order items
    rows, err := tx.Query(ctx, `
        SELECT sku, qty
        FROM sales_order_items
        WHERE order_id = $1
        ORDER BY sku
    `, id)
    if err != nil {
        return result, err
    }

    items := make([]model.CreateOrderItemRequest, 0)

    for rows.Next() {
        var item model.CreateOrderItemRequest

        if err := rows.Scan(&item.SKU, &item.Qty); err != nil {
            rows.Close()
            return result, err
        }

        items = append(items, item)
    }

    if err := rows.Err(); err != nil {
        rows.Close()
        return result, err
    }
    rows.Close()

    // return stock and write stock movement history
    for _, item := range items {
        var productID int

        err := tx.QueryRow(ctx, `
            UPDATE products
            SET stock = stock + $2
            WHERE sku = $1
              AND stock::bigint + $2 <= 2147483647
            RETURNING id
        `, item.SKU, item.Qty).Scan(&productID)

        if errors.Is(err, pgx.ErrNoRows) {
            return result, ErrStockRestoreOverflow
        }
        if err != nil {
            return result, err
        }

        _, err = tx.Exec(ctx, `
            INSERT INTO stock_movements
                (product_id, type, qty, note)
            VALUES ($1, 'in', $2, $3)
        `, productID, item.Qty,
            fmt.Sprintf("Cancel sales order #%d", id))

        if err != nil {
            return result, err
        }
    }

    // update status after all stock successfully returned
    _, err = tx.Exec(ctx, `
        UPDATE sales_orders
        SET status = 'CANCELLED',
            cancelled_at = now()
        WHERE id = $1 AND status = 'CREATED'
    `, id)
    if err != nil {
        return result, err
    }

    if err := tx.Commit(ctx); err != nil {
        return result, err
    }

    return r.Detail(ctx, id)
}
