package models

import "time"

// Voucher represents a voucher entity in the system.
type Voucher struct {
	ID                 string    `json:"id"`
	Name               string    `json:"name"`
	Code               string    `json:"code"`
	Amount             int64     `json:"amount"` // in NGN (1,000 <= amount <= 30,000)
	MaxRedemptions     int       `json:"max_redemptions"`
	CurrentRedemptions int       `json:"current_redemptions"`
	ExpiryDate         time.Time `json:"expiry_date"`
	SecurityQuestion   *string   `json:"security_question,omitempty"`
	SecurityAnswer     *string   `json:"-"` 
	CreatedAt          time.Time `json:"created_at"`
}

// HasSecurityQuestion returns true if the voucher requires a security answer.
func (v *Voucher) HasSecurityQuestion() bool {
	return v.SecurityQuestion != nil && *v.SecurityQuestion != ""
}

// RemainingRedemptions returns how many claims are left.
func (v *Voucher) RemainingRedemptions() int {
	rem := v.MaxRedemptions - v.CurrentRedemptions
	if rem < 0 {
		return 0
	}
	return rem
}

// IsExpired checks if the voucher has passed its expiry time.
func (v *Voucher) IsExpired() bool {
	return time.Now().After(v.ExpiryDate)
}

// Redemption represents a successful claim of a voucher.
type Redemption struct {
	ID                 string    `json:"id"`
	VoucherID          string    `json:"voucher_id"`
	RedeemerIdentifier string    `json:"redeemer_identifier"`
	RedeemedAt         time.Time `json:"redeemed_at"`
	Notes              *string   `json:"notes,omitempty"`
}
