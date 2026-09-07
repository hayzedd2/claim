package database

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"claim/internal/models"
)

func setupTestDB(t *testing.T) *Repository {
	t.Helper()
	db, err := Open(":memory:")
	if err != nil {
		t.Fatalf("failed to open in-memory db: %v", err)
	}

	ctx := context.Background()
	if err := Init(ctx, db); err != nil {
		t.Fatalf("failed to init db: %v", err)
	}

	t.Cleanup(func() {
		db.Close()
	})

	return NewRepository(db)
}

func TestVoucherCRUD(t *testing.T) {
	repo := setupTestDB(t)
	ctx := context.Background()

	secQ := "What is the capital of Nigeria?"
	secA := "Abuja"

	voucher := &models.Voucher{
		ID:               "custom-id-should-be-ignored",
		Name:             "Dev Lunch",
		Code:             "DEV-LUNCH-500",
		Amount:           5000,
		MaxRedemptions:   5,
		ExpiryDate:       time.Now().Add(24 * time.Hour).UTC(),
		SecurityQuestion: &secQ,
		SecurityAnswer:   &secA,
	}

	created, err := repo.CreateVoucher(ctx, voucher)
	if err != nil {
		t.Fatalf("failed to create voucher: %v", err)
	}
	if !strings.HasPrefix(created.ID, "CLAIM-") {
		t.Fatalf("expected ID to start with 'CLAIM-', got: %s", created.ID)
	}

	// Fetch by uppercase code
	fetched, err := repo.GetVoucherByCode(ctx, "DEV-LUNCH-500")
	if err != nil {
		t.Fatalf("failed to get voucher by code: %v", err)
	}
	if fetched.Name != "Dev Lunch" {
		t.Errorf("expected name 'Dev Lunch', got '%s'", fetched.Name)
	}

	// Fetch by lowercase code (case-insensitive test)
	fetchedLower, err := repo.GetVoucherByCode(ctx, "dev-lunch-500")
	if err != nil {
		t.Fatalf("failed to get voucher by lowercase code: %v", err)
	}
	if fetchedLower.ID != created.ID {
		t.Errorf("expected matching ID for case-insensitive lookup")
	}

	// Duplicate code rejection test
	duplicateVoucher := &models.Voucher{
		Name:           "Another Lunch",
		Code:           "dev-lunch-500",
		Amount:         2000,
		MaxRedemptions: 1,
		ExpiryDate:     time.Now().Add(24 * time.Hour).UTC(),
	}
	_, err = repo.CreateVoucher(ctx, duplicateVoucher)
	if !errors.Is(err, ErrDuplicateCode) {
		t.Errorf("expected ErrDuplicateCode, got %v", err)
	}
}

func TestVoucherRedemptionFlow(t *testing.T) {
	repo := setupTestDB(t)
	ctx := context.Background()

	secQ := "Team lead food?"
	secA := "Amala"

	v := &models.Voucher{
		Name:             "Team treat",
		Code:             "TREAT2026",
		Amount:           3000,
		MaxRedemptions:   2,
		ExpiryDate:       time.Now().Add(2 * time.Hour).UTC(),
		SecurityQuestion: &secQ,
		SecurityAnswer:   &secA,
	}

	_, err := repo.CreateVoucher(ctx, v)
	if err != nil {
		t.Fatalf("failed to create voucher: %v", err)
	}

	// 1. Redeem with wrong security answer
	wrongAns := "Pizza"
	_, _, err = repo.RedeemVoucher(ctx, "treat2026", "Azeez", &wrongAns, nil)
	if !errors.Is(err, ErrInvalidSecurityAnswer) {
		t.Fatalf("expected ErrInvalidSecurityAnswer, got: %v", err)
	}

	// 2. Redeem without required security answer
	_, _, err = repo.RedeemVoucher(ctx, "treat2026", "Azeez", nil, nil)
	if !errors.Is(err, ErrSecurityAnswerRequired) {
		t.Fatalf("expected ErrSecurityAnswerRequired, got: %v", err)
	}

	// 3. Redeem successfully (case-insensitive answer check: "amala" vs "Amala")
	correctAns := "amala"
	notes := "Thanks for lunch!"
	red1, updatedV1, err := repo.RedeemVoucher(ctx, "treat2026", "Azeez", &correctAns, &notes)
	if err != nil {
		t.Fatalf("expected successful redemption, got: %v", err)
	}
	if !strings.HasPrefix(red1.ID, "RDM-") {
		t.Fatalf("expected redemption ID to start with 'RDM-', got: %s", red1.ID)
	}
	if updatedV1.CurrentRedemptions != 1 {
		t.Fatalf("unexpected redemption state: count=%d", updatedV1.CurrentRedemptions)
	}

	// 4. Redeem second time (reaches limit)
	red2, updatedV2, err := repo.RedeemVoucher(ctx, "TREAT2026", "Alhameen", &correctAns, nil)
	if err != nil {
		t.Fatalf("expected second redemption to succeed, got: %v", err)
	}
	if updatedV2.CurrentRedemptions != 2 {
		t.Fatalf("expected current_redemptions = 2, got: %d", updatedV2.CurrentRedemptions)
	}
	if red2.VoucherID != updatedV2.ID {
		t.Fatalf("redemption voucher ID mismatch")
	}

	// 5. Attempt 3rd redemption (should fail due to limit)
	_, _, err = repo.RedeemVoucher(ctx, "TREAT2026", "ThirdUser", &correctAns, nil)
	if !errors.Is(err, ErrLimitExceeded) {
		t.Fatalf("expected ErrLimitExceeded, got: %v", err)
	}

	// 6. Check redemptions list
	redemptions, _, err := repo.GetRedemptionsByVoucherCode(ctx, "TREAT2026")
	if err != nil {
		t.Fatalf("failed to get redemptions: %v", err)
	}
	if len(redemptions) != 2 {
		t.Fatalf("expected 2 redemptions, got %d", len(redemptions))
	}
}

func TestVoucherExpired(t *testing.T) {
	repo := setupTestDB(t)
	ctx := context.Background()

	v := &models.Voucher{
		Name:           "Expired voucher",
		Code:             "PAST2020",
		Amount:         1000,
		MaxRedemptions: 5,
		ExpiryDate:     time.Now().Add(-1 * time.Hour).UTC(),
	}

	_, err := repo.CreateVoucher(ctx, v)
	if err != nil {
		t.Fatalf("failed to create voucher: %v", err)
	}

	_, _, err = repo.RedeemVoucher(ctx, "PAST2020", "Azeez", nil, nil)
	if !errors.Is(err, ErrExpired) {
		t.Fatalf("expected ErrExpired, got: %v", err)
	}
}

func TestSchemaConstraints(t *testing.T) {
	repo := setupTestDB(t)
	ctx := context.Background()

	// Amount under 1000 check constraint
	invalidAmount := &models.Voucher{
		Name:           "Too cheap",
		Code:           "CHEAP",
		Amount:         500, // < 1000
		MaxRedemptions: 1,
		ExpiryDate:     time.Now().Add(24 * time.Hour).UTC(),
	}
	_, err := repo.CreateVoucher(ctx, invalidAmount)
	if err == nil || !strings.Contains(err.Error(), "CHECK constraint failed") {
		t.Fatalf("expected CHECK constraint failed for amount < 1000, got: %v", err)
	}

	// MaxRedemptions > 1000 check constraint
	invalidLimit := &models.Voucher{
		Name:           "Too many",
		Code:           "OVERFLOW",
		Amount:         1000,
		MaxRedemptions: 5000, // > 1000
		ExpiryDate:     time.Now().Add(24 * time.Hour).UTC(),
	}
	_, err = repo.CreateVoucher(ctx, invalidLimit)
	if err == nil || !strings.Contains(err.Error(), "CHECK constraint failed") {
		t.Fatalf("expected CHECK constraint failed for max_redemptions > 1000, got: %v", err)
	}
}
