package router

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"stockflow/internal/handler"
	"stockflow/internal/repository"
	"stockflow/internal/service"
)

func New(db *pgxpool.Pool) http.Handler {
	mux := http.NewServeMux()

	// Dependency Injection
	productRepo := repository.NewProductRepository(db)
	productService := service.NewProductService(productRepo)
	productHandler := handler.NewProductHandler(productService)
	stockRepo := repository.NewStockRepository(db)
	stockService := service.NewStockService(stockRepo)
	stockHandler := handler.NewStockHandler(stockService)
	orderRepo := repository.NewOrderRepository(db)
	orderService := service.NewOrderService(orderRepo)
	orderHandler := handler.NewOrderHandler(orderService)

	// Product Routes
	mux.HandleFunc("GET /api/products", productHandler.List)
	mux.HandleFunc("POST /api/products", productHandler.Create)
	mux.HandleFunc("PUT /api/products/{id}", productHandler.Update)
	mux.HandleFunc("DELETE /api/products/{id}", productHandler.Delete)
	mux.HandleFunc("GET /api/products/summary", productHandler.Summary)

	// Stock Routes
	mux.HandleFunc("POST /api/products/{id}/adjust", stockHandler.Adjust)
	mux.HandleFunc("GET /api/products/{id}/movements", stockHandler.Movements)

	// Order routes
	mux.HandleFunc("POST /api/orders", orderHandler.Create)
	mux.HandleFunc("GET /api/orders/{id}", orderHandler.Detail)
	mux.HandleFunc("POST /api/orders/{id}/cancel", orderHandler.Cancel)

	// Root Routes
	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{
			"status":  "success",
			"message": "StockFlow API is running",
		})
	})

	// Health Routes
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()

		if err := db.Ping(ctx); err != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{
				"status":  "error",
				"message": "Database is unreachable",
			})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{
			"status":  "success",
			"message": "API and database are healthy",
		})
	})

	return mux
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	_ = json.NewEncoder(w).Encode(data)
}
