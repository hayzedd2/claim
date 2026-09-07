package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"claim/internal/database"
)

func setupTestApp(t *testing.T) http.Handler {
	t.Helper()

	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}

	ctx := context.Background()
	if err := database.Init(ctx, db); err != nil {
		t.Fatalf("failed to init test db: %v", err)
	}

	t.Cleanup(func() {
		db.Close()
	})

	repo := database.NewRepository(db)
	h := NewHandler(repo)

	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	return CORS(mux)
}

func TestCreateVoucherEndpoint(t *testing.T) {
	app := setupTestApp(t)

	secQ := "What is our team lead's favorite food?"
	secA := "Amala"

	payload := CreateVoucherRequest{
		Name:             "Team Dev Lunch",
		Code:             "CLAIM2026",
		Amount:           5000,
		MaxRedemptions:   10,
		ExpiryDate:       time.Now().Add(48 * time.Hour).UTC(),
		SecurityQuestion: &secQ,
		SecurityAnswer:   &secA,
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/vouchers", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	app.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status 201 Created, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp VoucherResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if !strings.HasPrefix(resp.ID, "CLAIM-") {
		t.Errorf("expected ID prefix 'CLAIM-', got: %s", resp.ID)
	}
	if resp.Code != "CLAIM2026" {
		t.Errorf("expected code CLAIM2026, got %s", resp.Code)
	}
	if !resp.HasSecurityQuestion {
		t.Errorf("expected HasSecurityQuestion to be true")
	}

	// Test Duplicate Code
	dupReq := httptest.NewRequest(http.MethodPost, "/api/vouchers", bytes.NewReader(body))
	dupReq.Header.Set("Content-Type", "application/json")
	dupRec := httptest.NewRecorder()
	app.ServeHTTP(dupRec, dupReq)

	if dupRec.Code != http.StatusConflict {
		t.Fatalf("expected status 409 Conflict for duplicate code, got %d", dupRec.Code)
	}

	// Test Invalid Amount (< 1000)
	invalidPayload := payload
	invalidPayload.Code = "NEWCODE"
	invalidPayload.Amount = 500
	invBody, _ := json.Marshal(invalidPayload)
	invReq := httptest.NewRequest(http.MethodPost, "/api/vouchers", bytes.NewReader(invBody))
	invReq.Header.Set("Content-Type", "application/json")
	invRec := httptest.NewRecorder()
	app.ServeHTTP(invRec, invReq)

	if invRec.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400 Bad Request for amount < 1000, got %d", invRec.Code)
	}
}

func TestGetVoucherEndpoint(t *testing.T) {
	app := setupTestApp(t)

	// Create voucher
	secQ := "Fav snack?"
	secA := "Plantain Chips"
	createPayload := CreateVoucherRequest{
		Name:             "Snack Time",
		Code:             "SNACK100",
		Amount:           1500,
		MaxRedemptions:   3,
		ExpiryDate:       time.Now().Add(24 * time.Hour).UTC(),
		SecurityQuestion: &secQ,
		SecurityAnswer:   &secA,
	}
	b, _ := json.Marshal(createPayload)
	req := httptest.NewRequest(http.MethodPost, "/api/vouchers", bytes.NewReader(b))
	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, req)

	// Fetch public info
	getReq := httptest.NewRequest(http.MethodGet, "/api/vouchers/snack100", nil)
	getRec := httptest.NewRecorder()
	app.ServeHTTP(getRec, getReq)

	if getRec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", getRec.Code, getRec.Body.String())
	}

	var pubResp PublicVoucherResponse
	if err := json.NewDecoder(getRec.Body).Decode(&pubResp); err != nil {
		t.Fatalf("failed to decode public response: %v", err)
	}

	if pubResp.Code != "SNACK100" || pubResp.RemainingRedemptions != 3 {
		t.Fatalf("unexpected public voucher payload: %+v", pubResp)
	}
	if pubResp.SecurityQuestion == nil || *pubResp.SecurityQuestion != secQ {
		t.Fatalf("expected security question in public response")
	}

	// 404 test for non-existent voucher
	notFoundReq := httptest.NewRequest(http.MethodGet, "/api/vouchers/NONEXISTENT", nil)
	notFoundRec := httptest.NewRecorder()
	app.ServeHTTP(notFoundRec, notFoundReq)

	if notFoundRec.Code != http.StatusNotFound {
		t.Fatalf("expected status 404 for missing voucher, got %d", notFoundRec.Code)
	}
}

func TestRedeemVoucherEndpoint(t *testing.T) {
	app := setupTestApp(t)

	secQ := "Lead city?"
	secA := "Lagos"
	createPayload := CreateVoucherRequest{
		Name:             "City Treat",
		Code:             "CITY500",
		Amount:           2500,
		MaxRedemptions:   1,
		ExpiryDate:       time.Now().Add(24 * time.Hour).UTC(),
		SecurityQuestion: &secQ,
		SecurityAnswer:   &secA,
	}
	b, _ := json.Marshal(createPayload)
	req := httptest.NewRequest(http.MethodPost, "/api/vouchers", bytes.NewReader(b))
	app.ServeHTTP(httptest.NewRecorder(), req)

	// 1. Redeem with wrong answer -> 400 Bad Request
	wrongAns := "Abuja"
	redeemReq1 := RedeemRequest{
		RedeemerName:   "Azeez",
		SecurityAnswer: &wrongAns,
	}
	r1Body, _ := json.Marshal(redeemReq1)
	httpR1 := httptest.NewRequest(http.MethodPost, "/api/vouchers/CITY500/redeem", bytes.NewReader(r1Body))
	rec1 := httptest.NewRecorder()
	app.ServeHTTP(rec1, httpR1)

	if rec1.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400 for wrong security answer, got %d: %s", rec1.Code, rec1.Body.String())
	}

	// 2. Redeem successfully -> 200 OK
	correctAns := "lagos" // case-insensitive check
	notes := "Yum!"
	redeemReq2 := RedeemRequest{
		RedeemerName:   "Azeez",
		SecurityAnswer: &correctAns,
		Notes:          &notes,
	}
	r2Body, _ := json.Marshal(redeemReq2)
	httpR2 := httptest.NewRequest(http.MethodPost, "/api/vouchers/CITY500/redeem", bytes.NewReader(r2Body))
	rec2 := httptest.NewRecorder()
	app.ServeHTTP(rec2, httpR2)

	if rec2.Code != http.StatusOK {
		t.Fatalf("expected status 200 for successful redemption, got %d: %s", rec2.Code, rec2.Body.String())
	}

	var redResp RedeemResponse
	if err := json.NewDecoder(rec2.Body).Decode(&redResp); err != nil {
		t.Fatalf("failed to decode redeem response: %v", err)
	}
	if redResp.Status != "success" || !strings.HasPrefix(redResp.RedemptionID, "RDM-") {
		t.Fatalf("unexpected redemption response: %+v", redResp)
	}

	// 3. Redeem again when limit is reached -> 410 Gone
	httpR3 := httptest.NewRequest(http.MethodPost, "/api/vouchers/CITY500/redeem", bytes.NewReader(r2Body))
	rec3 := httptest.NewRecorder()
	app.ServeHTTP(rec3, httpR3)

	if rec3.Code != http.StatusGone {
		t.Fatalf("expected status 410 Gone for exhausted limit, got %d: %s", rec3.Code, rec3.Body.String())
	}
}

func TestGetRedemptionsEndpoint(t *testing.T) {
	app := setupTestApp(t)

	createPayload := CreateVoucherRequest{
		Name:           "Coffee Treat",
		Code:           "COFFEE2026",
		Amount:         2000,
		MaxRedemptions: 5,
		ExpiryDate:     time.Now().Add(24 * time.Hour).UTC(),
	}
	b, _ := json.Marshal(createPayload)
	req := httptest.NewRequest(http.MethodPost, "/api/vouchers", bytes.NewReader(b))
	app.ServeHTTP(httptest.NewRecorder(), req)

	// Redeem once
	redeemReq := RedeemRequest{RedeemerName: "Azeez"}
	rb, _ := json.Marshal(redeemReq)
	rReq := httptest.NewRequest(http.MethodPost, "/api/vouchers/COFFEE2026/redeem", bytes.NewReader(rb))
	app.ServeHTTP(httptest.NewRecorder(), rReq)

	// Fetch redemptions analytics
	analyticsReq := httptest.NewRequest(http.MethodGet, "/api/vouchers/COFFEE2026/redemptions", nil)
	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, analyticsReq)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", rec.Code, rec.Body.String())
	}

	var summary RedemptionsSummaryResponse
	if err := json.NewDecoder(rec.Body).Decode(&summary); err != nil {
		t.Fatalf("failed to decode summary: %v", err)
	}

	if summary.Voucher.Code != "COFFEE2026" || summary.Voucher.CurrentRedemptions != 1 {
		t.Errorf("unexpected voucher summary: %+v", summary.Voucher)
	}
	if len(summary.Redemptions) != 1 || summary.Redemptions[0].RedeemerName != "Azeez" {
		t.Errorf("unexpected redemptions list: %+v", summary.Redemptions)
	}
}

func TestCORSPreflight(t *testing.T) {
	app := setupTestApp(t)

	req := httptest.NewRequest(http.MethodOptions, "/api/vouchers", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	rec := httptest.NewRecorder()

	app.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204 No Content for OPTIONS preflight, got %d", rec.Code)
	}
	if rec.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Errorf("expected Access-Control-Allow-Origin to be *")
	}
}
