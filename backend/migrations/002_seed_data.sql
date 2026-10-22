BEGIN;

-- seed products
INSERT INTO products (sku, name, price, stock, is_active) VALUES
    ('ELC-001', 'Wireless Mouse',          125000,  45, TRUE),
    ('ELC-002', 'Keyboard USB',            175000,  30, TRUE),
    ('ELC-003', 'USB-C Hub 6-in-1',        325000,  18, TRUE),
    ('ELC-004', 'Kabel USB-C 1 Meter',      45000,  80, TRUE),
    ('ELC-005', 'Charger USB-C 25W',       210000,  26, TRUE),
    ('OFF-001', 'Buku Catatan A5',          28000, 120, TRUE),
    ('OFF-002', 'Pulpen Gel Hitam',         12000, 200, TRUE),
    ('OFF-003', 'Paket Sticky Notes',       18000,  90, TRUE),
    ('OFF-004', 'Map Dokumen A4',            8000, 150, TRUE),
    ('FUR-001', 'Kursi Kerja Ergonomis',   1250000,  8, TRUE),
    ('FUR-002', 'Meja Kerja 120 cm',       1850000,  5, TRUE),
    ('NET-001', 'Router Wi-Fi AC1200',      465000,  14, TRUE),
    ('NET-002', 'Kabel LAN Cat6 5 Meter',    35000,  60, TRUE),
    ('ACC-001', 'Headset Kabel',            95000,  22, TRUE),
    ('ACC-002', 'Webcam Full HD',          385000,  11, TRUE)
ON CONFLICT (sku) DO NOTHING;

-- seed stock movement sample
INSERT INTO stock_movements (product_id, type, qty, note)
SELECT p.id, v.type, v.qty, v.note
FROM (VALUES
    ('ELC-001', 'in',  50, 'Stok awal dari pemasok'),
    ('ELC-001', 'out',  5, 'Penjualan toko'),
    ('OFF-001', 'in', 120, 'Restock bulanan'),
    ('NET-001', 'in',  14, 'Stok awal dari pemasok'),
    ('ACC-002', 'out',  2, 'Penjualan toko')
) AS v(sku, type, qty, note)
JOIN products p ON p.sku = v.sku
WHERE NOT EXISTS (
    SELECT 1
    FROM stock_movements sm
    WHERE sm.product_id = p.id
      AND sm.type = v.type
      AND sm.qty = v.qty
      AND sm.note = v.note
);

-- sample order 1
WITH new_orders AS (
    INSERT INTO sales_orders (customer, status, total, created_at)
    SELECT v.customer, v.status, v.total, v.created_at
    FROM (VALUES
        ('Toko Sinar Jaya', 'CREATED',  425000, now() - INTERVAL '2 days'),
        ('CV Maju Bersama', 'CANCELLED',  95000, now() - INTERVAL '1 day')
    ) AS v(customer, status, total, created_at)
    WHERE NOT EXISTS (
        SELECT 1
        FROM sales_orders so
        WHERE so.customer = v.customer
          AND so.total = v.total
          AND so.created_at >= now() - INTERVAL '7 days'
    )
    RETURNING id, customer
)
INSERT INTO sales_order_items (order_id, sku, qty, unit_price)
SELECT no.id, v.sku, v.qty, v.unit_price
FROM new_orders no
JOIN (VALUES
    ('Toko Salsabila', 'ELC-001', 2, 125000),
    ('Toko Salsabila', 'ELC-004', 1,  45000),
    ('Toko Salsabila', 'OFF-001',  2,  28000),
    ('CV Maju Bersama', 'ACC-001',  1,  95000)
) AS v(customer, sku, qty, unit_price)
  ON v.customer = no.customer;

-- sample order 2
WITH new_orders AS(
    INSERT INTO sales_orders(customer, status, total, created_at)
    SELECT v.customer, v.status, v.total, v.created_at
    FROM (VALUES
        ( 'PT Sejahtera', 'CREATED', 325000, now() - INTERVAL '1 day')
    ) AS v(customer, status, total, created_at)
    RETURNING id, customer
)
INSERT INTO sales_order_items(order_id, sku, qty, unit_price)
SELECT no.id, v.sku, v.qty, v.unit_price
FROM new_orders no
JOIN (VALUES
    ('PT Sejahtera', 'ELC-003', 1, 325000)
) AS v(customer, sku, qty, unit_price)
  ON v.customer = no.customer;

COMMIT;
