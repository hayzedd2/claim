# Claim Voucher System — API Documentation

**Base URL**: `http://localhost:8080`  
**Content-Type**: `application/json`

---


---

## Endpoints

### 1. Create a Voucher
Creates a new voucher with custom redemption limits, amount, expiry, and optional security challenge.

- **URL**: `/api/vouchers`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`

#### Request Body
| Field | Type | Required? | Constraints / Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | Purpose / title of the voucher (e.g. `"Team Dev Lunch"`) |
| `code` | `string` | **Yes** | Preferred promo code. Unique, case-insensitive (e.g. `"CLAIM2026"`) |
| `amount` | `integer` | **Yes** | Value in Naira. Must be between `1,000` and `30,000` |
| `max_redemptions` | `integer` | **Yes** | Allowed claims count. Must be between `1` and `1,000` |
| `expiry_date` | `string` | **Yes** | RFC 3339 timestamp strictly in the future (e.g. `"2026-12-31T23:59:59Z"`) |
| `security_question` | `string` | Optional | Challenge question for redemption |
| `security_answer` | `string` | Optional* | Challenge answer. *Required if `security_question` is set* |

#### Example Request
```bash
curl -X POST http://localhost:8080/api/vouchers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Team Dev Lunch",
    "code": "CLAIM2026",
    "amount": 5000,
    "max_redemptions": 10,
    "expiry_date": "2026-12-31T23:59:59Z",
    "security_question": "What is our team lead'\''s favorite food?",
    "security_answer": "Amala"
  }'
```

#### Response (`201 Created`)
```json
{
  "id": "CLAIM-7f9e8a1b-4d2c-4e8f-9a1b-2c3d4e5f6a7b",
  "name": "Team Dev Lunch",
  "code": "CLAIM2026",
  "amount": 5000,
  "max_redemptions": 10,
  "current_redemptions": 0,
  "expiry_date": "2026-12-31T23:59:59Z",
  "has_security_question": true,
  "created_at": "2026-09-07T17:30:00Z"
}
```

---

### 2. Get Public Voucher Details
Fetches public voucher metadata before claiming. **Note:** The security answer is never exposed.

- **URL**: `/api/vouchers/{code}`
- **Method**: `GET`

#### URL Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `code` | `string` | Voucher code (case-insensitive) |

#### Example Request
```bash
curl -X GET http://localhost:8080/api/vouchers/CLAIM2026
```

#### Response (`200 OK`)
```json
{
  "code": "CLAIM2026",
  "name": "Team Dev Lunch",
  "amount": 5000,
  "remaining_redemptions": 10,
  "is_expired": false,
  "has_security_question": true,
  "security_question": "What is our team lead's favorite food?"
}
```

#### Errors
- `404 Not Found`: `{"error": "Voucher not found"}`

---

### 3. Redeem a Voucher
Atomically claims a voucher for a user. Increments redemption count and records audit trail.

- **URL**: `/api/vouchers/{code}/redeem`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`

#### Request Body
| Field | Type | Required? | Description |
| :--- | :--- | :--- | :--- |
| `redeemer_name` | `string` | **Yes** | Identifier/name/handle of the claimant |
| `security_answer` | `string` | Conditional | Required if the voucher has a security question (evaluated case-insensitively) |
| `notes` | `string` | Optional | Custom memo / review note |

#### Example Request
```bash
curl -X POST http://localhost:8080/api/vouchers/CLAIM2026/redeem \
  -H "Content-Type: application/json" \
  -d '{
    "redeemer_name": "Azeez",
    "security_answer": "amala",
    "notes": "Thanks for the treat!"
  }'
```

#### Response (`200 OK`)
```json
{
  "status": "success",
  "message": "Voucher redeemed successfully!",
  "amount": 5000,
  "redemption_id": "RDM-3c2b1a0d-8e4f-4a1b-9c2d-3e4f5a6b7c8d",
  "redeemed_at": "2026-09-07T17:45:00Z"
}
```

#### Errors
- `400 Bad Request`: `{"error": "Incorrect security answer"}` or `{"error": "Security answer is required to redeem this voucher"}`
- `404 Not Found`: `{"error": "Voucher not found"}`
- `410 Gone`: `{"error": "This voucher has expired"}` or `{"error": "This voucher has reached its maximum redemption limit"}`

---

### 4. Get Voucher Redemptions (Tracker / Analytics)
Returns voucher summary along with a chronological list of all successful redemptions for creator tracking.

- **URL**: `/api/vouchers/{code}/redemptions`
- **Method**: `GET`

#### Example Request
```bash
curl -X GET http://localhost:8080/api/vouchers/CLAIM2026/redemptions
```

#### Response (`200 OK`)
```json
{
  "voucher": {
    "id": "CLAIM-7f9e8a1b-4d2c-4e8f-9a1b-2c3d4e5f6a7b",
    "name": "Team Dev Lunch",
    "code": "CLAIM2026",
    "amount": 5000,
    "max_redemptions": 10,
    "current_redemptions": 2,
    "expiry_date": "2026-12-31T23:59:59Z",
    "has_security_question": true,
    "created_at": "2026-09-07T17:30:00Z"
  },
  "redemptions": [
    {
      "id": "RDM-3c2b1a0d-8e4f-4a1b-9c2d-3e4f5a6b7c8d",
      "redeemer_name": "Azeez",
      "redeemed_at": "2026-09-07T17:45:00Z",
      "notes": "Thanks for the treat!"
    },
    {
      "id": "RDM-9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
      "redeemer_name": "Alhameen",
      "redeemed_at": "2026-09-07T17:40:00Z",
      "notes": null
    }
  ]
}
```

---

### 5. List All Vouchers
Lists all vouchers ordered from newest to oldest.

- **URL**: `/api/vouchers`
- **Method**: `GET`

#### Example Request
```bash
curl -X GET http://localhost:8080/api/vouchers
```

#### Response (`200 OK`)
```json
[
  {
    "id": "CLAIM-7f9e8a1b-4d2c-4e8f-9a1b-2c3d4e5f6a7b",
    "name": "Team Dev Lunch",
    "code": "CLAIM2026",
    "amount": 5000,
    "max_redemptions": 10,
    "current_redemptions": 2,
    "expiry_date": "2026-12-31T23:59:59Z",
    "has_security_question": true,
    "created_at": "2026-09-07T17:30:00Z"
  }
]
```

---

### 6. Health Check
Health check endpoint to verify server status.

- **URL**: `/api/health`
- **Method**: `GET`

#### Response (`200 OK`)
```json
{
  "status": "ok",
  "time": "2026-09-07T17:45:00Z"
}
```
