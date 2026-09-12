package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"claim/internal/database"
	"claim/internal/models"
)

// Handler holds dependencies for HTTP route handlers.
type Handler struct {
	repo *database.Repository
}

// NewHandler creates a new Handler instance.
func NewHandler(repo *database.Repository) *Handler {
	return &Handler{repo: repo}
}

// RegisterRoutes registers all REST API routes on the provided ServeMux.
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/vouchers", h.CreateVoucher)
	mux.HandleFunc("GET /api/vouchers", h.ListVouchers)
	mux.HandleFunc("GET /api/vouchers/{code}", h.GetVoucher)
	mux.HandleFunc("POST /api/vouchers/{code}/redeem", h.RedeemVoucher)
	mux.HandleFunc("GET /api/vouchers/{code}/redemptions", h.GetRedemptions)
}

// --- Request and Response DTOs ---

type CreateVoucherRequest struct {
	Name             string    `json:"name"`
	Code             string    `json:"code"`
	Amount           int64     `json:"amount"`
	MaxRedemptions   int       `json:"max_redemptions"`
	ExpiryDate       time.Time `json:"expiry_date"`
	SecurityQuestion *string   `json:"security_question"`
	SecurityAnswer   *string   `json:"security_answer"`
}

type VoucherResponse struct {
	ID                  string    `json:"id"`
	Name                string    `json:"name"`
	Code                string    `json:"code"`
	Amount              int64     `json:"amount"`
	MaxRedemptions      int       `json:"max_redemptions"`
	CurrentRedemptions  int       `json:"current_redemptions"`
	ExpiryDate          time.Time `json:"expiry_date"`
	HasSecurityQuestion bool      `json:"has_security_question"`
	CreatedAt           time.Time `json:"created_at"`
}

type PublicVoucherResponse struct {
	Code                 string    `json:"code"`
	Name                 string    `json:"name"`
	Amount               int64     `json:"amount"`
	ExpiryDate           time.Time `json:"expiry_date"`
	RemainingRedemptions int       `json:"remaining_redemptions"`
	IsExpired            bool      `json:"is_expired"`
	HasSecurityQuestion  bool      `json:"has_security_question"`
	SecurityQuestion     *string   `json:"security_question,omitempty"`
}

type RedeemRequest struct {
	RedeemerName   string  `json:"redeemer_name"`
	SecurityAnswer *string `json:"security_answer"`
	Notes          *string `json:"notes"`
}

type RedeemResponse struct {
	Status       string    `json:"status"`
	Message      string    `json:"message"`
	Amount       int64     `json:"amount"`
	RedemptionID string    `json:"redemption_id"`
	RedeemedAt   time.Time `json:"redeemed_at"`
}

type RedemptionItemResponse struct {
	ID           string    `json:"id"`
	RedeemerName string    `json:"redeemer_name"`
	RedeemedAt   time.Time `json:"redeemed_at"`
	Notes        *string   `json:"notes,omitempty"`
}

type RedemptionsSummaryResponse struct {
	Voucher     VoucherResponse          `json:"voucher"`
	Redemptions []RedemptionItemResponse `json:"redemptions"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}


func (h *Handler) CreateVoucher(w http.ResponseWriter, r *http.Request) {
	var req CreateVoucherRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid JSON payload: "+err.Error())
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		respondError(w, http.StatusBadRequest, "Voucher name is required")
		return
	}

	req.Code = strings.ToUpper(strings.TrimSpace(req.Code))
	if req.Code == "" {
		respondError(w, http.StatusBadRequest, "Voucher code is required")
		return
	}

	if req.Amount < 1000 || req.Amount > 30000 {
		respondError(w, http.StatusBadRequest, "Amount must be between ₦1,000 and ₦30,000")
		return
	}

	if req.MaxRedemptions < 1 || req.MaxRedemptions > 1000 {
		respondError(w, http.StatusBadRequest, "Max redemptions must be between 1 and 1,000")
		return
	}

	if req.ExpiryDate.IsZero() || time.Now().UTC().After(req.ExpiryDate) {
		respondError(w, http.StatusBadRequest, "Expiry date must be in the future")
		return
	}

	hasQ := req.SecurityQuestion != nil && strings.TrimSpace(*req.SecurityQuestion) != ""
	hasA := req.SecurityAnswer != nil && strings.TrimSpace(*req.SecurityAnswer) != ""
	if hasQ != hasA {
		respondError(w, http.StatusBadRequest, "Both security question and answer must be provided together")
		return
	}

	var secQ, secA *string
	if hasQ && hasA {
		q := strings.TrimSpace(*req.SecurityQuestion)
		a := strings.TrimSpace(*req.SecurityAnswer)
		secQ = &q
		secA = &a
	}

	v := &models.Voucher{
		Name:             req.Name,
		Code:             req.Code,
		Amount:           req.Amount,
		MaxRedemptions:   req.MaxRedemptions,
		ExpiryDate:       req.ExpiryDate,
		SecurityQuestion: secQ,
		SecurityAnswer:   secA,
	}

	created, err := h.repo.CreateVoucher(r.Context(), v)
	if err != nil {
		if errors.Is(err, database.ErrDuplicateCode) {
			respondError(w, http.StatusConflict, "A voucher with this code already exists")
			return
		}
		respondError(w, http.StatusInternalServerError, "Failed to create voucher: "+err.Error())
		return
	}

	resp := toVoucherResponse(created)
	respondJSON(w, http.StatusCreated, resp)
}


func (h *Handler) GetVoucher(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	if strings.TrimSpace(code) == "" {
		respondError(w, http.StatusBadRequest, "Voucher code is required")
		return
	}

	v, err := h.repo.GetVoucherByCode(r.Context(), code)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			respondError(w, http.StatusNotFound, "Voucher not found")
			return
		}
		respondError(w, http.StatusInternalServerError, "Failed to fetch voucher: "+err.Error())
		return
	}

	resp := PublicVoucherResponse{
		Code:                 v.Code,
		Name:                 v.Name,
		Amount:               v.Amount,
		ExpiryDate:           v.ExpiryDate,
		RemainingRedemptions: v.RemainingRedemptions(),
		IsExpired:            v.IsExpired(),
		HasSecurityQuestion:  v.HasSecurityQuestion(),
		SecurityQuestion:     v.SecurityQuestion,
	}

	respondJSON(w, http.StatusOK, resp)
}

// we mostly wont be using this or might introduce an identifier system, then be able to get vouchers created by `user-abc`
func (h *Handler) ListVouchers(w http.ResponseWriter, r *http.Request) {
	vouchers, err := h.repo.ListVouchers(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to list vouchers: "+err.Error())
		return
	}

	var resp []VoucherResponse
	for _, v := range vouchers {
		resp = append(resp, toVoucherResponse(&v))
	}

	if resp == nil {
		resp = []VoucherResponse{}
	}

	respondJSON(w, http.StatusOK, resp)
}


func (h *Handler) RedeemVoucher(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	if strings.TrimSpace(code) == "" {
		respondError(w, http.StatusBadRequest, "Voucher code is required")
		return
	}

	var req RedeemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid JSON payload: "+err.Error())
		return
	}

	req.RedeemerName = strings.TrimSpace(req.RedeemerName)
	if req.RedeemerName == "" {
		respondError(w, http.StatusBadRequest, "Redeemer name is required")
		return
	}

	redemption, voucher, err := h.repo.RedeemVoucher(
		r.Context(),
		code,
		req.RedeemerName,
		req.SecurityAnswer,
		req.Notes,
	)
	if err != nil {
		switch {
		case errors.Is(err, database.ErrNotFound):
			respondError(w, http.StatusNotFound, "Voucher not found")
		case errors.Is(err, database.ErrExpired):
			respondError(w, http.StatusGone, "This voucher has expired")
		case errors.Is(err, database.ErrLimitExceeded):
			respondError(w, http.StatusGone, "This voucher has reached its maximum redemption limit")
		case errors.Is(err, database.ErrInvalidSecurityAnswer):
			respondError(w, http.StatusBadRequest, "Incorrect security answer")
		case errors.Is(err, database.ErrSecurityAnswerRequired):
			respondError(w, http.StatusBadRequest, "Security answer is required to redeem this voucher")
		default:
			respondError(w, http.StatusInternalServerError, "Failed to redeem voucher: "+err.Error())
		}
		return
	}

	resp := RedeemResponse{
		Status:       "success",
		Message:      "Voucher redeemed successfully!",
		Amount:       voucher.Amount,
		RedemptionID: redemption.ID,
		RedeemedAt:   redemption.RedeemedAt,
	}

	respondJSON(w, http.StatusOK, resp)
}


func (h *Handler) GetRedemptions(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	if strings.TrimSpace(code) == "" {
		respondError(w, http.StatusBadRequest, "Voucher code is required")
		return
	}

	redemptions, voucher, err := h.repo.GetRedemptionsByVoucherCode(r.Context(), code)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			respondError(w, http.StatusNotFound, "Voucher not found")
			return
		}
		respondError(w, http.StatusInternalServerError, "Failed to fetch redemptions: "+err.Error())
		return
	}

	var items []RedemptionItemResponse
	for _, red := range redemptions {
		items = append(items, RedemptionItemResponse{
			ID:           red.ID,
			RedeemerName: red.RedeemerIdentifier,
			RedeemedAt:   red.RedeemedAt,
			Notes:        red.Notes,
		})
	}
	if items == nil {
		items = []RedemptionItemResponse{}
	}

	resp := RedemptionsSummaryResponse{
		Voucher:     toVoucherResponse(voucher),
		Redemptions: items,
	}

	respondJSON(w, http.StatusOK, resp)
}



func toVoucherResponse(v *models.Voucher) VoucherResponse {
	return VoucherResponse{
		ID:                  v.ID,
		Name:                v.Name,
		Code:                v.Code,
		Amount:              v.Amount,
		MaxRedemptions:      v.MaxRedemptions,
		CurrentRedemptions:  v.CurrentRedemptions,
		ExpiryDate:          v.ExpiryDate,
		HasSecurityQuestion: v.HasSecurityQuestion(),
		CreatedAt:           v.CreatedAt,
	}
}

func respondJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, ErrorResponse{Error: message})
}
