# Authentication API

## Endpoints

### POST /auth/register

Register a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe" // optional
}
```

**Success Response (201):**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "USER",
  "createdAt": "2026-02-05T00:00:00.000Z",
  "updatedAt": "2026-02-05T00:00:00.000Z"
}
```

**Error Responses:**

- 409 Conflict: Email already exists
- 400 Bad Request: Invalid input data

---

### POST /auth/login

Login with email and password.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**

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
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

- 401 Unauthorized: Invalid credentials

---

## Using JWT Token

To access protected routes, include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Example: Protected Route

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CurrentUser } from './auth/decorators/current-user.decorator';
import { UserResponseDto } from './users/dto/user-response.dto';

@Controller('profile')
export class ProfileController {
  @Get()
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: UserResponseDto) {
    return user;
  }
}
```

## Environment Variables

Make sure to add these to your `.env` file:

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_EXPIRES_IN=1d
```

## Security Notes

- Passwords are hashed using bcrypt with 10 salt rounds
- JWT tokens expire after 1 day (configurable via JWT_EXPIRES_IN)
- Email uniqueness is enforced at the database level
- Use strong JWT secrets (minimum 32 characters) in production
