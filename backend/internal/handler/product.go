package handler 

import (
	"encoding/json"
    "log"
    "net/http"
    "strconv"
    "strings"
    "errors"
    "io"

    "stockflow/internal/model"
    "stockflow/internal/service"
    "stockflow/internal/repository"

    "github.com/jackc/pgx/v5/pgconn"
    "github.com/jackc/pgx/v5"
)

type ProductHandler struct {
	service *service.ProductService
}

func NewProductHandler(
	productService *service.ProductService) *ProductHandler {
	return &ProductHandler{service: productService}
}

func (h *ProductHandler) List(
	w http.ResponseWriter,
	r *http.Request,
) {
	query := r.URL.Query()

	page, err := parsePositiveInt(query.Get("page"), 1)
	if err != nil {
		writeError(w, http.StatusBadRequest,
			"VALIDATION_ERROR", "page must be a positive integer")
		return 
	}

	limit, err := parsePositiveInt(query.Get("limit"), 10)
    if err != nil {
        writeError(w, http.StatusBadRequest,
            "VALIDATION_ERROR", "limit must be a positive integer")
        return
    }

	filter := strings.ToLower(strings.TrimSpace(query.Get("filter")))

    switch filter {
    case "", "all", "active", "inactive", "low_stock":
        // Valid filter.
    default:
        writeError(w, http.StatusBadRequest,
            "VALIDATION_ERROR", "invalid product filter")
        return
    }

	params := model.ProductListParams{
        Search: query.Get("search"),
        Filter: filter,
        Page:   page,
        Limit:  limit,
    }

    result, err := h.service.List(r.Context(), params)
    if err != nil {
        log.Printf("list products failed: %v", err)

        writeError(w, http.StatusInternalServerError,
            "INTERNAL_ERROR", "Failed to load products")
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)

    if err := json.NewEncoder(w).Encode(result); err != nil {
        log.Printf("encode products failed: %v", err)
    }
}

func parsePositiveInt(value string, defaultValue int) (int, error) {
    if value == "" {
        return defaultValue, nil
    }

    number, err := strconv.Atoi(value)
    if err != nil {
        return 0, err
    }

    if number <= 0 {
        return 0, strconv.ErrSyntax
    }

    return number, nil
}

func writeError(
    w http.ResponseWriter,
    status int,
    code string,
    message string,
) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)

    payload := struct {
        Error struct {
            Code    string `json:"code"`
            Message string `json:"message"`
        } `json:"error"`
    }{}

    payload.Error.Code = code
    payload.Error.Message = message

    _ = json.NewEncoder(w).Encode(payload)
}

func (h *ProductHandler) Create(
    w http.ResponseWriter,
    r *http.Request,
) {
    var req model.CreateProductRequest

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

    product, err := h.service.Create(r.Context(), req)
    if err != nil {
        var pgErr *pgconn.PgError

        if errors.As(err, &pgErr) && pgErr.Code == "23505" {
            writeError(w, http.StatusConflict,
                "DUPLICATE_SKU", "SKU already exists")
            return
        }

        switch {
        case errors.Is(err, service.ErrInvalidSKU),
            errors.Is(err, service.ErrInvalidName),
            errors.Is(err, service.ErrInvalidPrice),
            errors.Is(err, service.ErrInvalidStock):
            writeError(w, http.StatusBadRequest,
                "VALIDATION_ERROR", err.Error())
            return
        }

        log.Printf("create product failed: %v", err)
        writeError(w, http.StatusInternalServerError,
            "INTERNAL_ERROR", "Failed to create product")
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    _ = json.NewEncoder(w).Encode(product)
}

func (h *ProductHandler) Update(
    w http.ResponseWriter,
    r *http.Request,
) {
    id, err := strconv.Atoi(r.PathValue("id"))
    if err != nil || id <= 0 {
        writeError(w, http.StatusBadRequest,
            "VALIDATION_ERROR", "Invalid product ID")
        return
    }

    var req model.UpdateProductRequest

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

    product, err := h.service.Update(r.Context(), id, req)
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            writeError(w, http.StatusNotFound,
                "NOT_FOUND", "Product not found")
            return
        }

        if errors.Is(err, service.ErrInvalidName) ||
            errors.Is(err, service.ErrInvalidPrice) ||
            err.Error() == "is_active is required" {

            writeError(w, http.StatusBadRequest,
                "VALIDATION_ERROR", err.Error())
            return
        }

        log.Printf("update product failed: %v", err)
        writeError(w, http.StatusInternalServerError,
            "INTERNAL_ERROR", "Failed to update product")
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    _ = json.NewEncoder(w).Encode(product)
}


func (h *ProductHandler) Delete(
    w http.ResponseWriter,
    r *http.Request,
) {
    id, err := strconv.Atoi(r.PathValue("id"))

    if err != nil || id <= 0 {
        writeError(
            w,
            http.StatusBadRequest,
            "VALIDATION_ERROR",
            "Invalid product ID",
        )
        return
    }

    err = h.service.Delete(r.Context(), id)

    if err != nil {
        switch {
        case errors.Is(err, pgx.ErrNoRows):
            writeError(
                w,
                http.StatusNotFound,
                "NOT_FOUND",
                "Product not found",
            )

        case errors.Is(err, repository.ErrProductHasHistory):
            writeError(
                w,
                http.StatusConflict,
                "PRODUCT_HAS_HISTORY",
                "Product has stock or order history",
            )

        case errors.Is(err, service.ErrInvalidProductID):
            writeError(
                w,
                http.StatusBadRequest,
                "VALIDATION_ERROR",
                "Invalid product ID",
            )

        default:
            log.Printf("delete product failed: %v", err)

            writeError(
                w,
                http.StatusInternalServerError,
                "INTERNAL_ERROR",
                "Failed to delete product",
            )
        }
        return
    }

    w.WriteHeader(http.StatusNoContent)
}

func (h *ProductHandler) Summary(
    w http.ResponseWriter,
    r *http.Request,
) {
    summary, err := h.service.Summary(r.Context())

    if err != nil {
        log.Printf("get product summary failed: %v", err)

        writeError(
            w,
            http.StatusInternalServerError,
            "INTERNAL_ERROR",
            "Failed to load product summary",
        )
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)

    if err := json.NewEncoder(w).Encode(summary); err != nil {
        log.Printf("encode product summary failed: %v", err)
    }
}
