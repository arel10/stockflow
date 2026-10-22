
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

type StockHandler struct {
    service *service.StockService
}

func NewStockHandler(s *service.StockService) *StockHandler {
    return &StockHandler{service: s}
}

func (h *StockHandler) Adjust(
    w http.ResponseWriter,
    r *http.Request,
) {
    id, err := strconv.Atoi(r.PathValue("id"))
    if err != nil || id <= 0 {
        writeError(w, http.StatusBadRequest,
            "VALIDATION_ERROR", "Invalid product ID")
        return
    }

    var req model.AdjustStockRequest

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

    result, err := h.service.Adjust(r.Context(), id, req)
    if err != nil {
        var conflict *repository.StockConflict

        switch {
        case errors.As(err, &conflict):
            w.Header().Set("Content-Type", "application/json")
            w.WriteHeader(http.StatusConflict)

            _ = json.NewEncoder(w).Encode(map[string]interface{}{
                "error": map[string]interface{}{
                    "code":      "INSUFFICIENT_STOCK",
                    "available": conflict.Available,
                    "message":   "Not enough stock",
                },
            })
            return

        case errors.Is(err, pgx.ErrNoRows):
            writeError(w, http.StatusNotFound,
                "NOT_FOUND", "Product not found")
            return

		case errors.Is(err, service.ErrInvalidStockType),
				errors.Is(err, service.ErrInvalidStockQty),
			errors.Is(err, service.ErrInvalidProductID),
			errors.Is(err, service.ErrStockNoteTooLong),
			errors.Is(err, repository.ErrStockOverflow):
			writeError(w, http.StatusBadRequest,
				"VALIDATION_ERROR", err.Error())
			return
		}

        log.Printf("adjust stock failed: %v", err)

        writeError(w, http.StatusInternalServerError,
            "INTERNAL_ERROR", "Failed to adjust stock")
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    _ = json.NewEncoder(w).Encode(result)
}

func (h *StockHandler) Movements(
    w http.ResponseWriter,
    r *http.Request,
) {
    id, err := strconv.Atoi(r.PathValue("id"))
    if err != nil || id <= 0 {
        writeError(w, http.StatusBadRequest,
            "VALIDATION_ERROR", "Invalid product ID")
        return
    }

    movements, err := h.service.Movements(r.Context(), id)
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            writeError(w, http.StatusNotFound,
                "NOT_FOUND", "Product not found")
            return
        }

        log.Printf("get movements failed: %v", err)

        writeError(w, http.StatusInternalServerError,
            "INTERNAL_ERROR", "Failed to load movements")
        return
    }

    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(movements)
}
