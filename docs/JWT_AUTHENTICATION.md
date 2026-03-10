# JWT Authentication & Authorization

This document describes the JWT authentication and role-based access control (RBAC) implementation.

## Architecture Overview

### Components

1. **JwtStrategy** (`strategies/jwt.strategy.ts`)
   - Validates JWT tokens
   - Extracts token from `Authorization: Bearer <token>` header
   - Verifies token signature using `ACCESS_TOKEN_SECRET`
   - Validates user exists in database
   - Returns sanitized user object (excludes password)

2. **JwtAuthGuard** (`guards/jwt-auth.guard.ts`)
   - Thin wrapper around Passport's AuthGuard
   - Returns 401 Unauthorized for missing/invalid/expired tokens
   - Attaches validated user to `request.user`

3. **RolesGuard** (`guards/roles.guard.ts`)
   - Implements role-based access control
   - Checks user role against required roles from `@Roles()` decorator
   - Returns 403 Forbidden if role doesn't match

4. **@CurrentUser()** Decorator (`decorators/current-user.decorator.ts`)
   - Extracts authenticated user from request
   - Type-safe access to user data

5. **@Roles()** Decorator (`decorators/roles.decorator.ts`)
   - Specifies required roles for routes
   - Used with RolesGuard

## Security Features

### Token Validation

- ✅ Token signature verification
- ✅ Expiration check (handled by passport-jwt)
- ✅ Database validation (user must exist)
- ✅ Automatic 401 for expired/invalid tokens

### Password Protection

- ✅ Password never returned in responses (UserResponseDto excludes it)
- ✅ Password never in JWT payload
- ✅ Bcrypt hashing for stored passwords

### Best Practices

- ✅ Never trust decoded token without DB validation
- ✅ Short-lived access tokens (15m default)
- ✅ Long-lived refresh tokens in HttpOnly cookies
- ✅ Token rotation on refresh
- ✅ Clear error messages for debugging

## Usage Examples

### 1. Protect a Route with Authentication

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserResponseDto } from './dto/user-response.dto';

@Controller('users')
export class UsersController {
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: UserResponseDto) {
    return user;
  }
}
```

### 2. Protect a Route with Role-Based Access Control

```typescript
import { Controller, Delete, Param, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
export class UsersController {
  // Only ADMIN can delete users
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { message: 'User deleted successfully' };
  }
}
```

### 3. Multiple Roles

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
@Get('admin/dashboard')
getDashboard() {
  // Accessible by ADMIN or MODERATOR
}
```

### 4. Apply Guards at Controller Level

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  // All routes in this controller require ADMIN role

  @Get('users')
  getAllUsers() {}

  @Delete('users/:id')
  deleteUser() {}
}
```

### 5. Access Current User

```typescript
@UseGuards(JwtAuthGuard)
@Post('posts')
createPost(
  @CurrentUser() user: UserResponseDto,
  @Body() createPostDto: CreatePostDto,
) {
  return this.postsService.create({
    ...createPostDto,
    authorId: user.id, // Access user ID safely
  });
}
```

## Making Authenticated Requests

### 1. Login to Get Access Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Response:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Use Access Token in Requests

```bash
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Error Responses

### 401 Unauthorized (Authentication Required)

```json
{
  "statusCode": 401,
  "message": "Authentication required"
}
```

Causes:

- No Authorization header
- Invalid token format
- Token signature invalid
- User deleted from database

### 401 Unauthorized (Token Expired)

```json
{
  "statusCode": 401,
  "message": "Access token has expired"
}
```

Solution: Use refresh token to get new access token

### 403 Forbidden (Insufficient Permissions)

```json
{
  "statusCode": 403,
  "message": "Insufficient permissions. Required roles: ADMIN"
}
```

Cause: User's role doesn't match required roles

## Environment Variables

Required in `.env`:

```bash
# Access Token (short-lived)
ACCESS_TOKEN_SECRET=your-secret-key-min-32-chars-long-change-me
ACCESS_TOKEN_EXPIRES_IN=15m

# Refresh Token (long-lived)
REFRESH_TOKEN_SECRET=different-secret-key-min-32-chars-long
REFRESH_TOKEN_EXPIRES_IN=7d
```

⚠️ **Important**: Use different secrets for access and refresh tokens!

## Token Flow

### Initial Login

1. User sends credentials to `/auth/login`
2. Server validates credentials
3. Server generates access token (15m) and refresh token (7d)
4. Access token returned in response body
5. Refresh token set in HttpOnly cookie

### Authenticated Request

1. Client sends request with `Authorization: Bearer <accessToken>`
2. JwtAuthGuard validates token
3. JwtStrategy verifies signature and checks DB
4. User object attached to `request.user`
5. RolesGuard (if used) checks user role
6. Request proceeds to handler

### Token Refresh

1. Client sends request to `/auth/refresh` (refresh token in cookie)
2. Server validates refresh token
3. Server generates new access token
4. Server rotates refresh token (security best practice)
5. New tokens returned

### Logout

1. Client sends request to `/auth/logout` (refresh token in cookie)
2. Server invalidates refresh token in database
3. Client discards access token

## Testing

### Unit Testing Guards

```typescript
import { Test } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get(RolesGuard);
    reflector = module.get(Reflector);
  });

  it('should allow access when user has required role', () => {
    const mockContext = createMockExecutionContext({
      user: { role: UserRole.ADMIN },
    });

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(mockContext)).toBe(true);
  });
});
```

### Integration Testing Protected Routes

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Protected Routes (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(200);

    accessToken = loginResponse.body.accessToken;
  });

  it('should access protected route with valid token', () => {
    return request(app.getHttpServer())
      .get('/users/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('should reject request without token', () => {
    return request(app.getHttpServer()).get('/users/profile').expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## Common Issues

### Issue: "User not authenticated" in RolesGuard

**Cause**: RolesGuard executed before JwtAuthGuard

**Solution**: Always put JwtAuthGuard first

```typescript
@UseGuards(JwtAuthGuard, RolesGuard) // Correct order
```

### Issue: "ACCESS_TOKEN_SECRET is not defined"

**Cause**: Environment variable not set

**Solution**: Add to `.env` file and restart server

### Issue: Password returned in responses

**Cause**: Not using UserResponseDto or plainToInstance

**Solution**: Always use:

```typescript
return plainToInstance(UserResponseDto, user);
```

### Issue: Token expired immediately after login

**Cause**: Server/client time mismatch or wrong expiry format

**Solution**: Check `ACCESS_TOKEN_EXPIRES_IN` format (e.g., '15m', '1h', '7d')

## Security Checklist

- ✅ Use strong secrets (min 32 characters)
- ✅ Different secrets for access and refresh tokens
- ✅ Short-lived access tokens (15 minutes recommended)
- ✅ HttpOnly cookies for refresh tokens
- ✅ Token rotation on refresh
- ✅ Validate user exists in database
- ✅ Never return passwords
- ✅ Use HTTPS in production
- ✅ Set `secure: true` for cookies in production
- ✅ Implement rate limiting on auth endpoints
- ✅ Log authentication failures
- ✅ Implement account lockout after failed attempts

## Migration from Old Environment Variables

If you're using the old variable names, update your `.env`:

```bash
# Old (deprecated)
JWT_SECRET=...
JWT_EXPIRES_IN=...
JWT_REFRESH_SECRET=...
JWT_REFRESH_EXPIRES_IN=...

# New (current)
ACCESS_TOKEN_SECRET=...
ACCESS_TOKEN_EXPIRES_IN=...
REFRESH_TOKEN_SECRET=...
REFRESH_TOKEN_EXPIRES_IN=...
```
