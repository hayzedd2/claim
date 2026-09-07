CREATE TABLE IF NOT EXISTS vouchers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE COLLATE NOCASE,
    amount INTEGER NOT NULL CHECK (amount >= 1000 AND amount <= 30000),
    max_redemptions INTEGER NOT NULL CHECK (max_redemptions >= 1 AND max_redemptions <= 1000),
    current_redemptions INTEGER NOT NULL DEFAULT 0,
    expiry_date DATETIME NOT NULL,
    security_question TEXT,
    security_answer TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS redemptions (
    id TEXT PRIMARY KEY,
    voucher_id TEXT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    redeemer_identifier TEXT NOT NULL,
    redeemed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_redemptions_voucher_id ON redemptions(voucher_id);
