# Contract: Authentication

**Base URL**: `/api/v1`
**Auth Required**: No (these endpoints create/validate sessions)

---

## POST `/auth/register`

Create a new user account.

**Request**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Validation**
- `email`: required, valid email format, max 255 chars
- `password`: required, min 8 chars

**Response `201 Created`**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "created_at": "2026-03-04T10:00:00.000Z"
  }
}
```

**Errors**
| Status | Code | Condition |
|---|---|---|
| 409 | `EMAIL_TAKEN` | Email already registered |
| 422 | `VALIDATION_ERROR` | Invalid email format or password too short |

---

## POST `/auth/login`

Authenticate and receive JWT tokens.

**Request**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response `200 OK`**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 900
}
```

**Errors**
| Status | Code | Condition |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | Email or password incorrect |
| 422 | `VALIDATION_ERROR` | Missing required fields |

---

## POST `/auth/refresh`

Exchange a refresh token for a new access token.

**Request**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `200 OK`**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 900
}
```

**Errors**
| Status | Code | Condition |
|---|---|---|
| 401 | `INVALID_REFRESH_TOKEN` | Token expired, revoked, or malformed |

---

## POST `/auth/logout`

Revoke the refresh token.

**Request** *(Auth: `Bearer <access_token>`)*
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `204 No Content`**

---

## Standard Error Response Shape

All error responses follow this structure:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description of the error."
  }
}
```
