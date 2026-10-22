
package handler

import (
    "encoding/json"
    "errors"
    "io"
    "log"
    "net/http"
    "strconv"

    "github.com/jackc/pgx/v5"

    "stockflow/internal/model"
    "stockflow/internal/repository"
    "stockflow/internal/service"
)

type OrderHandler struct {
    service *service.OrderService
}

func NewOrderHandler(s *service.OrderService) *OrderHandler {
    return &OrderHandler{service: s}
}

func (h *OrderHandler) Create(
    w http.ResponseWriter,
    r *http.Request,
) {
    var req model.CreateOrderRequest

    r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

    decoder := json.NewDecoder(r.Body)
    decoder.DisallowUnknownFields()

    if err := decoder.Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest,
            "VALIDATION_ERROR", "Invalid JSON request")
        return
    }

    var extra interface{}
    if err := decoder.Decode(&extra); err != io.EOF {
        writeError(w, http.StatusBadRequest,
            "VALIDATION_ERROR", "Request must contain one JSON object")
        return
    }

    order, err := h.service.Create(r.Context(), req)

    if err != nil {
        var validation *repository.OrderValidationError
        var conflict *repository.OrderStockConflict

        switch {
        case errors.As(err, &validation):
            writeError(w, http.StatusBadRequest,
                "VALIDATION_ERROR", validation.Message)
            return

        case errors.As(err, &conflict):
            w.Header().Set("Content-Type", "application/json")
            w.WriteHeader(http.StatusConflict)

            _ = json.NewEncoder(w).Encode(map[string]any{
                "error": map[string]any{
                    "code": "INSUFFICIENT_STOCK",
                    "sku": conflict.SKU,
                    "available": conflict.Available,
                },
            })
            return

        case errors.Is(err, repository.ErrOrderTotalOverflow):
            writeError(w, http.StatusBadRequest,
                "VALIDATION_ERROR", err.Error())
            return
        }

        log.Printf("create order failed: %v", err)
        writeError(w, http.StatusInternalServerError,
            "INTERNAL_ERROR", "Failed to create order")
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    _ = json.NewEncoder(w).Encode(order)
}

func (h *OrderHandler) Detail(
    w http.ResponseWriter,
    r *http.Request,
) {
    id, err := strconv.Atoi(r.PathValue("id"))
    if err != nil || id <= 0 {
        writeError(w, http.StatusBadRequest,
            "VALIDATION_ERROR", "Invalid order ID")
        return
    }

    order, err := h.service.Detail(r.Context(), id)
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            writeError(w, http.StatusNotFound,
                "NOT_FOUND", "Order not found")
            return
        }

        log.Printf("order detail failed: %v", err)
        writeError(w, http.StatusInternalServerError,
            "INTERNAL_ERROR", "Failed to load order")
        return
    }

    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(order)
}

func (h *OrderHandler) Cancel(
    w http.ResponseWriter,
    r *http.Request,
) {
    id, err := strconv.Atoi(r.PathValue("id"))
    if err != nil || id <= 0 {
        writeError(w, http.StatusBadRequest,
            "VALIDATION_ERROR", "Invalid order ID")
        return
    }

    order, err := h.service.Cancel(r.Context(), id)
    if err != nil {
        switch {
        case errors.Is(err, pgx.ErrNoRows):
            writeError(w, http.StatusNotFound,
                "NOT_FOUND", "Order not found")
            return

        case errors.Is(err, repository.ErrOrderAlreadyCancelled):
            writeError(w, http.StatusConflict,
                "ORDER_ALREADY_CANCELLED",
                "Order has already been cancelled")
            return

        case errors.Is(err, repository.ErrStockRestoreOverflow):
            writeError(w, http.StatusConflict,
                "STOCK_OVERFLOW",
                "Cannot restore stock beyond maximum")
            return
        }

        log.Printf("cancel order failed: %v", err)
        writeError(w, http.StatusInternalServerError,
            "INTERNAL_ERROR", "Failed to cancel order")
        return
    }

    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(order)
}