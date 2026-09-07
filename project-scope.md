# Claim Voucher System — Specification & PRD

## 1. Overview & Architecture
The **Claim Voucher System** is a full-stack learning project consisting of a **Go REST API** backend and a **Vite (React + TypeScript)** frontend hosted in a monorepo setup. The application enables users to create customizable promotional or gift vouchers and allows other users to redeem them under strict business constraints.

```
claim/
├── go.mod
├── go.sum
├── main.go               # Go entry point & API router
├── handlers/             # HTTP handlers (create, redeem, list redemptions)
├── models/               # Go structs & data schema
├── frontend/             # Vite frontend application
│   ├── package.json
│   ├── vite.config.ts    # Dev proxy to Go API
│   ├── src/
│   │   ├── components/   # UI components (VoucherForm, RedeemModal, Dashboard)
│   │   ├── services/     # API client calls
│   │   └── App.tsx
└── README.md
```

---

## 2. Core Business Rules & Validations

### 2.1 Voucher Creation Rules
* **Name:** Required string identifying the voucher purpose (e.g., *"Friday Jollof Treat"*).
* **Preferred Code:**
  * Must be provided by the creator.
  * Must be **globally unique** (case-insensitive indexing recommended, e.g., `CHOW-LUNCH-500`).
* **Amount (Value in NGN):**
  * Minimum: **₦1,000**
  * Maximum: **₦30,000**
* **Redemption Limit:**
  * Minimum: **1 redemption**
  * Maximum: **1,000 redemptions**
* **Expiry Date:**
  * Required timestamp.
  * Must be strictly in the future at the time of creation.
* **Security Question & Answer (Optional Challenge):**
  * If provided, both the question and answer must be present.
  * The answer must be checked case-insensitively during redemption.
* **Vendor Locking (Phase 2):**
  * Flagged out of scope for the MVP.

### 2.2 Voucher Redemption Rules
* **Status Checks:**
  1. The code must exist in the database.
  2. Current date/time must be before `expiry_date`.
  3. `current_redemptions` must be strictly less than `max_redemptions`.
* **Security Check:**
  * If the voucher has a `security_question`, the user must submit `security_answer`.
  * The submitted answer must match the stored answer (normalized/case-insensitive comparison).
* **Concurrency & Atomicity:**
  * Redemptions must increment `current_redemptions` atomically (or via database transactions) to prevent double-spending when multiple users redeem concurrently.
* **Audit Trail:**
  * Every successful redemption logs the redeemer identifier and the timestamp.

---

## 3. Data Models (Database & Go Structs)

### 3.1 Voucher Entity
| Field | Type | Constraints / Description |
| :--- | :--- | :--- |
| `id` | `UUID` / `string` | Primary Key |
| `name` | `string` | Human-readable title |
| `code` | `string` | Unique index, e.g. uppercase alphanumeric |
| `amount` | `int64` | In Naira (1,000 <= amount <= 30,000) |
| `max_redemptions` | `int` | Allowed claims (1 <= max <= 1,000) |
| `current_redemptions` | `int` | Default `0`, tracked count |
| `expiry_date` | `time.Time` | ISO 8601 timestamp |
| `security_question` | `*string` | Nullable/Optional question string |
| `security_answer` | `*string` | Nullable/Optional expected answer |
| `created_at` | `time.Time` | Record creation timestamp |

### 3.2 Redemption Entity
| Field | Type | Constraints / Description |
| :--- | :--- | :--- |
| `id` | `UUID` / `string` | Primary Key |
| `voucher_id` | `UUID` / `string` | Foreign key linking to `vouchers.id` |
| `redeemer_identifier` | `string` | Name or email of the person redeeming |
| `redeemed_at` | `time.Time` | Timestamp of successful claim |
| `notes` | `*string` | Optional memo / feedback from user |

---

## 4. API Endpoints Specification

### `POST /api/vouchers`
Creates a new voucher.

**Request Payload:**
```json
{
  "name": "Team Dev Lunch",
  "code": "CLAIM2026",
  "amount": 5000,
  "max_redemptions": 10,
  "expiry_date": "2026-10-01T23:59:59Z",
  "security_question": "What is our team lead's favorite food?",
  "security_answer": "Amala"
}
```

**Response (201 Created):**
```json
{
  "id": "c7a2b9f8-1234-4567-89ab-cdef01234567",
  "name": "Team Dev Lunch",
  "code": "CLAIM2026",
  "amount": 5000,
  "max_redemptions": 10,
  "current_redemptions": 0,
  "expiry_date": "2026-10-01T23:59:59Z",
  "has_security_question": true,
  "created_at": "2026-09-07T15:30:00Z"
}
```

---

### `GET /api/vouchers/:code`
Fetches public voucher details prior to redemption (without exposing the answer).

**Response (200 OK):**
```json
{
  "code": "CLAIM2026",
  "name": "Team Dev Lunch",
  "amount": 5000,
  "remaining_redemptions": 10,
  "is_expired": false,
  "security_question": "What is our team lead's favorite food?"
}
```

---

### `POST /api/vouchers/:code/redeem`
Attempts to redeem a voucher.

**Request Payload:**
```json
{
  "redeemer_name": "Azeez",
  "security_answer": "Amala"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Voucher redeemed successfully!",
  "amount": 5000,
  "redeemed_at": "2026-09-07T16:00:00Z"
}
```

**Error Responses:**
* `400 Bad Request`: Incorrect security answer / Invalid input.
* `404 Not Found`: Voucher does not exist.
* `410 Gone`: Voucher expired or redemption limit exhausted.

---

### `GET /api/vouchers/:code/redemptions`
Screen/Dashboard tracking endpoint for creators to inspect who redeemed the voucher.

**Response (200 OK):**
```json
{
  "voucher": {
    "code": "CLAIM2026",
    "name": "Team Dev Lunch",
    "amount": 5000,
    "max_redemptions": 10,
    "current_redemptions": 3,
    "expiry_date": "2026-10-01T23:59:59Z"
  },
  "redemptions": [
    {
      "id": "e1f2a3b4-...",
      "redeemer_name": "Azeez",
      "redeemed_at": "2026-09-07T16:00:00Z"
    }
  ]
}
```

---

## 5. Frontend Screens & User Flows (Vite + React)

### Screen 1: Voucher Creation Form (`/create`)
* **Inputs:**
  * Voucher Name (Text)
  * Preferred Code (Text, uppercase auto-format)
  * Amount (Number slider or input with ₦1,000 - ₦30,000 bounds)
  * Max Redemptions (Number input, 1 - 1,000)
  * Expiry Date Picker (Calendar with min-date = tomorrow)
  * Optional Toggle: *"Require Security Question"*
    * Expands Question and Answer text fields.
* **Actions:**
  * Submit button triggers `POST /api/vouchers`.
  * On success, shows confirmation modal with shareable link and a direct link to the **Dashboard / Redemptions Screen**.

### Screen 2: Redeem Voucher Screen (`/redeem`)
* **Inputs:**
  * Voucher Code entry.
  * Redeemer identifier (Name / Handle).
  * Dynamic prompt: If the code has a question, reveal the security question input.
* **Feedback:**
  * Clear success card with claimed amount (₦X,XXX) and voucher name.
  * Informative error states: *"Expired"*, *"Fully Claimed"*, or *"Incorrect Security Answer"*.

### Screen 3: Creator Redemptions Tracker (`/vouchers/:code/analytics`)
* **Header Summary Cards:**
  * Total Value Issued (₦ Amount)
  * Redemptions Remaining (`Max - Current`)
  * Expiry Countdown
* **Redemptions Table:**
  * Columns: `#`, `Redeemer Name`, `Timestamp (Relative & Absolute)`, `Status`.
  * Real-time refresh or polling button to fetch the latest claims.

---

## 6. Implementation Roadmap
1. **Phase 1: Backend Scaffolding**
   - Initialize Go project with routing (`net/http` or `chi` / `gin`).
   - Define in-memory or SQLite database with `sync.Mutex` protection.
   - Implement `CreateVoucher`, `GetVoucher`, and `RedeemVoucher` handlers.
2. **Phase 2: Frontend Setup**
   - Scaffold Vite React TypeScript app in `/frontend`.
   - Setup `vite.config.ts` proxy to `localhost:8080`.
   - Build UI forms with form validation (Zod / React Hook Form).
3. **Phase 3: Integration & Dashboard**
   - Wire up frontend API service to backend routes.
   - Build Redemptions Tracker table.
4. **Phase 4 (Optional): Single Binary Packaging**
   - Run `npm run build` in `/frontend`.
   - Use `//go:embed frontend/dist` in `main.go` to serve the entire app as one binary.