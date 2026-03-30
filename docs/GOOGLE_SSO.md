# Google SSO Authentication

This document covers Google OAuth 2.0 setup, environment config, and flow for the SSO endpoints.

---

## 1. Create a Google OAuth App

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**.
4. Set **Application type** to **Web application**.
5. Under **Authorized redirect URIs**, add:
   - Development: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://your-domain.com/api/auth/google/callback`
6. Copy the **Client ID** and **Client Secret**.

---

## 2. Environment Variables

Add to your `.env` file:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

> All three variables are **required**. The app throws at startup if any are missing.

---

## 3. OAuth Flow

```
Browser                       Server                        Google
  |                              |                              |
  | GET /api/auth/google         |                              |
  |----------------------------->|                              |
  |          302 Redirect        |                              |
  |<-----------------------------|                              |
  |                              |                              |
  | GET accounts.google.com/...  |                              |
  |------------------------------------------------------------->|
  |               User grants consent                           |
  |         GET /api/auth/google/callback?code=...              |
  |<-------------------------------------------------------------|
  |----------------------------->|                              |
  |                              | Exchange code for profile    |
  |                              |----------------------------->|
  |                              |     Profile + tokens         |
  |                              |<-----------------------------|
  |   200 { accessToken, user }  |                              |
  |<-----------------------------|                              |
```

---

## 4. Account Linking Logic

| Step | Check                             | Outcome                                  |
| ---- | --------------------------------- | ---------------------------------------- |
| 1    | `providerId` match in DB          | Return existing Google-linked user       |
| 2    | Email match — `provider = local`  | **409 Conflict** (use password login)    |
| 3    | Email match — `provider != local` | Return existing SSO user                 |
| 4    | No match                          | Create new user with `provider = google` |

---

## 5. Security Notes

- **OAuth state / CSRF**: `state: true` has been **removed** from `GoogleStrategy` because passport-oauth2's built-in state verification requires server-side session storage (`express-session`), which this application does not configure. The callback URL is already protected by HTTPS and the short-lived authorization code; if you add session middleware in future you can re-enable `state: true` to get automatic CSRF state validation.
- **HttpOnly cookie**: The refresh token is set via a `HttpOnly; Secure; SameSite=Strict` cookie, never in the response body.
- **SSO-only accounts**: Users created via Google have no `passwordHash` and cannot authenticate via `POST /api/auth/login`.
- **Race conditions**: Concurrent first-time logins for the same email are handled — P2002 unique constraint errors fall back to a lookup.

---

## 6. Related

- [AUTH_API.md](./AUTH_API.md) — full endpoint reference
- [JWT_AUTHENTICATION.md](./JWT_AUTHENTICATION.md) — access token usage
- [REFRESH_TOKEN.md](./REFRESH_TOKEN.md) — refresh token rotation strategy
