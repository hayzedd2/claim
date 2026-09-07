package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"claim/internal/models"

	"github.com/google/uuid"
)

var (
	ErrNotFound               = errors.New("voucher not found")
	ErrExpired                = errors.New("voucher has expired")
	ErrLimitExceeded          = errors.New("voucher redemption limit reached")
	ErrInvalidSecurityAnswer  = errors.New("incorrect security answer")
	ErrSecurityAnswerRequired = errors.New("security answer is required")
	ErrDuplicateCode          = errors.New("voucher code already exists")
)

// Repository defines the database operations interface.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new Repository instance.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// CreateVoucher inserts a new voucher into the database.
func (r *Repository) CreateVoucher(ctx context.Context, v *models.Voucher) (*models.Voucher, error) {
	v.ID = fmt.Sprintf("CLAIM-%s", uuid.NewString())
	v.CreatedAt = time.Now().UTC()
	v.Code = strings.ToUpper(strings.TrimSpace(v.Code))

	query := `
		INSERT INTO vouchers (
			id, name, code, amount, max_redemptions, current_redemptions,
			expiry_date, security_question, security_answer, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err := r.db.ExecContext(
		ctx,
		query,
		v.ID,
		v.Name,
		v.Code,
		v.Amount,
		v.MaxRedemptions,
		v.CurrentRedemptions,
		v.ExpiryDate.Format(time.RFC3339),
		v.SecurityQuestion,
		v.SecurityAnswer,
		v.CreatedAt.Format(time.RFC3339),
	)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") || strings.Contains(err.Error(), "constraint failed: UNIQUE") {
			return nil, ErrDuplicateCode
		}
		return nil, fmt.Errorf("failed to create voucher: %w", err)
	}

	return v, nil
}

// GetVoucherByCode fetches a voucher by its code (case-insensitive).
func (r *Repository) GetVoucherByCode(ctx context.Context, code string) (*models.Voucher, error) {
	query := `
		SELECT id, name, code, amount, max_redemptions, current_redemptions,
		       expiry_date, security_question, security_answer, created_at
		FROM vouchers
		WHERE code = ? COLLATE NOCASE
	`

	row := r.db.QueryRowContext(ctx, query, strings.TrimSpace(code))
	return scanVoucher(row)
}

// GetVoucherByID fetches a voucher by its unique ID.
func (r *Repository) GetVoucherByID(ctx context.Context, id string) (*models.Voucher, error) {
	query := `
		SELECT id, name, code, amount, max_redemptions, current_redemptions,
		       expiry_date, security_question, security_answer, created_at
		FROM vouchers
		WHERE id = ?
	`

	row := r.db.QueryRowContext(ctx, query, id)
	return scanVoucher(row)
}

// ListVouchers fetches all vouchers ordered by created_at DESC.
func (r *Repository) ListVouchers(ctx context.Context) ([]models.Voucher, error) {
	query := `
		SELECT id, name, code, amount, max_redemptions, current_redemptions,
		       expiry_date, security_question, security_answer, created_at
		FROM vouchers
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list vouchers: %w", err)
	}
	defer rows.Close()

	var vouchers []models.Voucher
	for rows.Next() {
		v, err := scanVoucherRow(rows)
		if err != nil {
			return nil, err
		}
		vouchers = append(vouchers, *v)
	}

	return vouchers, rows.Err()
}

// RedeemVoucher atomically validates and claims a voucher in a transaction.
func (r *Repository) RedeemVoucher(
	ctx context.Context,
	code string,
	redeemerIdentifier string,
	securityAnswer *string,
	notes *string,
) (*models.Redemption, *models.Voucher, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Select voucher for update
	query := `
		SELECT id, name, code, amount, max_redemptions, current_redemptions,
		       expiry_date, security_question, security_answer, created_at
		FROM vouchers
		WHERE code = ? COLLATE NOCASE
	`

	row := tx.QueryRowContext(ctx, query, strings.TrimSpace(code))
	v, err := scanVoucher(row)
	if err != nil {
		return nil, nil, err
	}

	// 1. Check expiration
	if time.Now().UTC().After(v.ExpiryDate) {
		return nil, nil, ErrExpired
	}

	// 2. Check redemption limit
	if v.CurrentRedemptions >= v.MaxRedemptions {
		return nil, nil, ErrLimitExceeded
	}

	// 3. Check security question & answer if configured
	if v.HasSecurityQuestion() {
		if securityAnswer == nil || strings.TrimSpace(*securityAnswer) == "" {
			return nil, nil, ErrSecurityAnswerRequired
		}
		if v.SecurityAnswer != nil {
			stored := strings.TrimSpace(*v.SecurityAnswer)
			provided := strings.TrimSpace(*securityAnswer)
			if !strings.EqualFold(stored, provided) {
				return nil, nil, ErrInvalidSecurityAnswer
			}
		}
	}

	// 4. Increment current_redemptions atomically
	updateQuery := `
		UPDATE vouchers
		SET current_redemptions = current_redemptions + 1
		WHERE id = ? AND current_redemptions < max_redemptions
	`
	res, err := tx.ExecContext(ctx, updateQuery, v.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to increment voucher redemptions: %w", err)
	}
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return nil, nil, ErrLimitExceeded
	}

	// 5. Insert redemption record
	redemption := &models.Redemption{
		ID:                 fmt.Sprintf("RDM-%s", uuid.NewString()),
		VoucherID:          v.ID,
		RedeemerIdentifier: strings.TrimSpace(redeemerIdentifier),
		RedeemedAt:         time.Now().UTC(),
		Notes:              notes,
	}

	insertRedemptionQuery := `
		INSERT INTO redemptions (id, voucher_id, redeemer_identifier, redeemed_at, notes)
		VALUES (?, ?, ?, ?, ?)
	`
	_, err = tx.ExecContext(
		ctx,
		insertRedemptionQuery,
		redemption.ID,
		redemption.VoucherID,
		redemption.RedeemerIdentifier,
		redemption.RedeemedAt.Format(time.RFC3339),
		redemption.Notes,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to record redemption: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, nil, fmt.Errorf("failed to commit redemption transaction: %w", err)
	}

	v.CurrentRedemptions++
	return redemption, v, nil
}

// GetRedemptionsByVoucherCode fetches all redemptions for a voucher.
func (r *Repository) GetRedemptionsByVoucherCode(ctx context.Context, code string) ([]models.Redemption, *models.Voucher, error) {
	v, err := r.GetVoucherByCode(ctx, code)
	if err != nil {
		return nil, nil, err
	}

	query := `
		SELECT id, voucher_id, redeemer_identifier, redeemed_at, notes
		FROM redemptions
		WHERE voucher_id = ?
		ORDER BY redeemed_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, v.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to query redemptions: %w", err)
	}
	defer rows.Close()

	var redemptions []models.Redemption
	for rows.Next() {
		var red models.Redemption
		var redeemedAtStr string
		var notes sql.NullString

		if err := rows.Scan(&red.ID, &red.VoucherID, &red.RedeemerIdentifier, &redeemedAtStr, &notes); err != nil {
			return nil, nil, fmt.Errorf("failed to scan redemption: %w", err)
		}

		if t, err := parseTime(redeemedAtStr); err == nil {
			red.RedeemedAt = t
		}
		if notes.Valid {
			red.Notes = &notes.String
		}

		redemptions = append(redemptions, red)
	}

	return redemptions, v, rows.Err()
}

// Helper scanner for single row
type scannable interface {
	Scan(dest ...any) error
}

func scanVoucher(row scannable) (*models.Voucher, error) {
	var v models.Voucher
	var expiryStr, createdStr string
	var secQ, secA sql.NullString

	err := row.Scan(
		&v.ID,
		&v.Name,
		&v.Code,
		&v.Amount,
		&v.MaxRedemptions,
		&v.CurrentRedemptions,
		&expiryStr,
		&secQ,
		&secA,
		&createdStr,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to scan voucher: %w", err)
	}

	if t, err := parseTime(expiryStr); err == nil {
		v.ExpiryDate = t
	}
	if t, err := parseTime(createdStr); err == nil {
		v.CreatedAt = t
	}
	if secQ.Valid {
		v.SecurityQuestion = &secQ.String
	}
	if secA.Valid {
		v.SecurityAnswer = &secA.String
	}

	return &v, nil
}

func scanVoucherRow(rows *sql.Rows) (*models.Voucher, error) {
	return scanVoucher(rows)
}

func parseTime(value string) (time.Time, error) {
	layouts := []string{
		time.RFC3339,
		"2006-01-02 15:04:05-07:00",
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
	}
	for _, l := range layouts {
		if t, err := time.Parse(l, value); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("unable to parse time: %s", value)
}
