# Refresh Token Implementation

## Overview

The authentication system now includes refresh token functionality for improved security and user experience. Refresh tokens are long-lived tokens that allow users to obtain new access tokens without re-entering credentials.

## Architecture

### Token Strategy

- **Access Token:**
  - Short-lived (15 minutes by default)
  - JWT format
  - Used for API authentication
  - Payload: `userId`, `email`

- **Refresh Token:**
  - Long-lived (7 days by default)
  - Cryptographically secure random token
  - Stored as bcrypt hash in database
  - Sent via HttpOnly cookie
  - Rotated on every refresh

## Database Schema

### RefreshToken Model

```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  tokenHash String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
  @@map("refresh_tokens")
}
```

**Security Features:**

- Tokens stored as hashed values (bcrypt with 10 salt rounds)
- Automatic cascade deletion when user is deleted
- Expiration tracking
- Indexed for performance

## API Endpoints

### POST /api/auth/login

Now returns access token in response body and sets refresh token in HttpOnly cookie.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "createdAt": "2026-02-05T00:00:00.000Z",
    "updatedAt": "2026-02-05T00:00:00.000Z"
  },
  "accessToken": "eyJhbGc..."
}
```

**Cookie Set:**

```
Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

---

### POST /api/auth/refresh

Exchanges a valid refresh token for a new access token and rotates the refresh token.

**Headers:**

- Cookie must contain `refreshToken`

**Response:**

```json
{
  "accessToken": "eyJhbGc..."
}
```

**Cookie Updated:**

- Old refresh token is revoked
- New refresh token is set in cookie

**Error Responses:**

- `401` - Refresh token not found
- `401` - Invalid refresh token
- `401` - Refresh token expired

---

### POST /api/auth/logout

Revokes the refresh token and clears the cookie.

**Headers:**

- Cookie with `refreshToken` (optional)

**Response:**

```json
{
  "message": "Logged out successfully"
}
```

**Cookie Cleared:**

- `refreshToken` cookie is removed

---

## Environment Configuration

Required environment variables:

```env
# Access Token
JWT_SECRET=your-32-char-secret
JWT_EXPIRES_IN=15m

# Refresh Token
JWT_REFRESH_SECRET=different-32-char-secret
JWT_REFRESH_EXPIRES_IN=7d
```

**Security Requirements:**

- Use different secrets for access and refresh tokens
- Minimum 32 characters for each secret
- Rotate secrets regularly in production

## Security Features

### Token Storage

- ✅ Refresh tokens never stored in plain text
- ✅ Bcrypt hashing with 10 salt rounds
- ✅ Automatic cleanup on user deletion

### Cookie Security

- ✅ `HttpOnly` flag prevents JavaScript access
- ✅ `Secure` flag in production (HTTPS only)
- ✅ `SameSite=Strict` prevents CSRF attacks
- ✅ Explicit `Max-Age` for expiration

### Token Rotation

- ✅ New refresh token on every refresh
- ✅ Old token immediately revoked
- ✅ Prevents token reuse attacks

### Validation

- ✅ Token hash verification
- ✅ Expiration checking
- ✅ User existence validation
- ✅ Automatic expired token cleanup

## Client Implementation Example

### Login Flow

```typescript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
  credentials: 'include', // Important: include cookies
});

const { user, accessToken } = await response.json();

// Store access token (e.g., in memory or state)
localStorage.setItem('accessToken', accessToken);
```

### API Requests with Access Token

```typescript
const response = await fetch('/api/protected-endpoint', {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
  credentials: 'include', // Important: include cookies
});
```

### Automatic Token Refresh

```typescript
async function fetchWithTokenRefresh(url, options = {}) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: 'include',
  });

  // If access token expired, refresh it
  if (response.status === 401) {
    const refreshResponse = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshResponse.ok) {
      const { accessToken: newToken } = await refreshResponse.json();
      localStorage.setItem('accessToken', newToken);

      // Retry original request
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        },
        credentials: 'include',
      });
    } else {
      // Refresh failed, redirect to login
      window.location.href = '/login';
      throw new Error('Session expired');
    }
  }

  return response;
}
```

### Logout

```typescript
await fetch('/api/auth/logout', {
  method: 'POST',
  credentials: 'include',
});

localStorage.removeItem('accessToken');
```

## Testing

### Test Login with Refresh Token

```bash
# Login
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Response will include access token
# Cookie will be saved to cookies.txt
```

### Test Refresh Token

```bash
# Use refresh token from cookie
curl -b cookies.txt -X POST http://localhost:3000/api/auth/refresh

# New access token returned
# New refresh token set in cookie
```

### Test Logout

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/auth/logout

# Refresh token revoked
# Cookie cleared
```

## Migration Notes

### Database Migration

Run the migration to add the RefreshToken table:

```bash
pnpm prisma migrate dev --name add_refresh_token_model
```

### Backward Compatibility

Existing login flows will continue to work. The refresh token functionality is additive and doesn't break existing implementations.

## Troubleshooting

### "Refresh token not found"

- Ensure `credentials: 'include'` is set in fetch requests
- Check that cookies are enabled
- Verify CORS configuration allows credentials

### "Invalid refresh token"

- Token may have been revoked
- Database record may have been deleted
- Token hash mismatch (token was modified)

### "Refresh token expired"

- Token exceeded `JWT_REFRESH_EXPIRES_IN` duration
- User needs to log in again

### Cookies not being set

- Check `NODE_ENV` - secure flag only in production
- Verify domain and path settings
- Check browser cookie settings

## Best Practices

1. **Never expose refresh tokens**
   - Keep them in HttpOnly cookies only
   - Never send in URLs or localStorage

2. **Implement refresh logic client-side**
   - Automatically refresh when access token expires
   - Handle refresh failures gracefully

3. **Monitor refresh token usage**
   - Log refresh events for security auditing
   - Alert on suspicious refresh patterns

4. **Regularly rotate secrets**
   - Rotate `JWT_SECRET` and `JWT_REFRESH_SECRET`
   - Implement gradual secret rotation strategy

5. **Clean up expired tokens**
   - Implement cron job to delete expired refresh tokens
   - Keep database size manageable

## Future Enhancements

Potential improvements:

- Device fingerprinting for additional security
- Maximum concurrent sessions per user
- Suspicious activity detection
- Token blacklisting for immediate revocation
- Refresh token family tracking
