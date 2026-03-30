# Auth API

All routes are prefixed with `/api`.

---

## POST /api/auth/register

Register a new user account.

**Auth:** Not required

**Request body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

| Field      | Type   | Required | Constraints      |
| ---------- | ------ | -------- | ---------------- |
| `email`    | string | yes      | valid email      |
| `password` | string | yes      | min 6 characters |
| `name`     | string | no       | display name     |

**Response `201`:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "USER",
  "createdAt": "2026-03-10T00:00:00.000Z",
  "updatedAt": "2026-03-10T00:00:00.000Z"
}
```

**Error responses:**

| Status | Reason                   |
| ------ | ------------------------ |
| `400`  | Validation error         |
| `409`  | Email already registered |

---

## POST /api/auth/login

Authenticate with email and password. Returns an access token in the response body and sets a `refreshToken` HttpOnly cookie.

**Auth:** Not required

**Request body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

| Field      | Type   | Required |
| ---------- | ------ | -------- |
| `email`    | string | yes      |
| `password` | string | yes      |

**Response `200`:**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "createdAt": "2026-03-10T00:00:00.000Z",
    "updatedAt": "2026-03-10T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Cookie set:**

```
Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

**Error responses:**

| Status | Reason              |
| ------ | ------------------- |
| `401`  | Invalid credentials |

---

## POST /api/auth/refresh

Exchange the `refreshToken` HttpOnly cookie for a new access token. The old refresh token is revoked and a new one is issued (token rotation).

**Auth:** Not required — requires `refreshToken` cookie

**Request body:** none

**Response `200`:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Cookie updated:** old `refreshToken` is revoked; a new one is set with the same options.

**Error responses:**

| Status | Reason                                            |
| ------ | ------------------------------------------------- |
| `401`  | Refresh token cookie missing, invalid, or expired |

---

## POST /api/auth/logout

Revoke the current refresh token and clear the cookie.

**Auth:** Not required — reads `refreshToken` cookie if present

**Request body:** none

**Response `200`:**

```json
{
  "message": "Logged out successfully"
}
```

**Cookie cleared:** `refreshToken` cookie is removed.

---

## Authentication for protected routes

Include the access token in the `Authorization` header for all protected endpoints:

```
Authorization: Bearer <accessToken>
```

See [JWT_AUTHENTICATION.md](./JWT_AUTHENTICATION.md) for implementation details and [REFRESH_TOKEN.md](./REFRESH_TOKEN.md) for the token rotation strategy.

---

## GET /api/auth/google

Initiate Google OAuth 2.0 login. Redirects the browser to the Google consent screen.

**Auth:** Not required

**Request body:** none

**Response:** `302 Redirect` to Google OAuth consent screen

---

## GET /api/auth/google/callback

OAuth callback handler. Google redirects here after the user grants or denies consent.
Issues an access token and sets a `refreshToken` cookie.

**Auth:** Not required — handled by Passport internally via `state` CSRF token

**Request body:** none

**Response `200`:**

See [GOOGLE_SSO.md](./GOOGLE_SSO.md) for environment setup and flow details.
