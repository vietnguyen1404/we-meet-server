# WM-7: Add Google SSO to NestJS Authentication System

## 1. Feature Summary

This feature adds Google OAuth 2.0 authentication to the existing NestJS auth module. Users can sign in via Google and receive the same JWT access + refresh token pair currently issued by the local auth flow. First-time Google users are auto-registered; returning users are matched by providerId or email.

---

## 2. Problem Statement

The application currently supports only email/password authentication, which requires users to create and remember a separate account. Most modern users expect social login. Adding Google SSO reduces sign-up friction, increases conversion, and is a prerequisite for future social-provider expansion.

---

## 3. Technical Design

### Affected Modules

| File                               | Change                                                  |
| ---------------------------------- | ------------------------------------------------------- |
| prisma/schema.prisma               | Make passwordHash nullable; add provider (AuthProvider enum) and providerId fields |
| src/users/entities/user.entity.ts  | Add provider and providerId properties                  |
| .env.example                       | Add the three new Google env vars                       |
| src/auth/strategies/google.strategy.ts | **New** — Passport Google OAuth strategy           |
| src/auth/guards/google-auth.guard.ts   | **New** — guard that initiates OAuth redirect       |
| src/auth/auth.service.ts           | Extract issueTokens(user), add googleLogin(profile)     |
| src/auth/auth.controller.ts        | Add GET /auth/google and GET /auth/google/callback      |
| src/auth/auth.module.ts            | Register GoogleStrategy; import passport-google-oauth20 |
| src/users/users.repository.ts      | Add findByProviderId(providerId) and createGoogleUser() |
| src/users/dto/user-response.dto.ts | Expose provider field as AuthProvider type              |

### Services to Modify or Create

**AuthService**

- Extract private issueTokens(user: User) helper shared by login() and googleLogin().
- Add async googleLogin(profile: GoogleProfile):
  1. Look up user by providerId.
  2. If found, return existing user.
  3. If not found, look up by email.
     - Email with provider=local exists: throw ConflictException.
     - Email not found: create new user with provider=google, providerId, passwordHash=null.
  4. Call issueTokens(user) and return tokens + user DTO.

**GoogleStrategy** (new: src/auth/strategies/google.strategy.ts)

- Extends PassportStrategy(GoogleOAuth2Strategy, google).
- Constructor reads GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL from ConfigService.
- Sets scope: [email, profile] and state: true for CSRF protection.
- validate() extracts { email, name, providerId: profile.id, picture } and returns a plain GoogleProfile object.
- No DB call in validate() — DB interaction belongs in AuthService.googleLogin().

### Database Changes

Modify the User model in prisma/schema.prisma:

- Change passwordHash from String to String? (nullable, SSO users have no password)
- Add provider String @default("local") — values: local or google
- Add providerId String? @unique — stores Google sub (profile.id)

Migration: pnpm prisma migrate dev --name add-sso-provider-fields
Impact: passwordHash becomes nullable; existing local rows keep their value. No backfill needed.

### API Endpoints

| Method | Path                      | Description                                                              |
| ------ | ------------------------- | ------------------------------------------------------------------------ |
| GET    | /api/auth/google          | Initiates Google OAuth redirect (Passport redirects to Google)           |
| GET    | /api/auth/google/callback | Validates OAuth code, sets refresh token cookie, returns AuthResponseDto |

GET /api/auth/google — GoogleAuthGuard triggers Passport redirect. No controller body needed.

GET /api/auth/google/callback:

- Passport validates code via GoogleStrategy.validate(), returns GoogleProfile.
- Controller calls authService.googleLogin(profile).
- Sets refreshToken in HttpOnly cookie using same COOKIE_OPTIONS as login.
- Returns AuthResponseDto: { user: UserResponseDto, accessToken: string }.
- On error: throws ConflictException (email conflict) or UnauthorizedException (invalid token / cancelled).

### Validation Rules

- GoogleAuthGuard validates OAuth state parameter automatically via passport-google-oauth20 state:true.
- GoogleStrategy.validate() throws UnauthorizedException if Google profile has no email.
- AuthService.googleLogin() throws ConflictException if email exists with provider=local.
- All three Google env vars enforced by Zod schema in env.validation.ts — app fails fast at startup.
- passwordHash nullability is enforced at service level (not Prisma schema constraint).

---

## 4. Edge Cases

1. **User cancels Google login** — Google redirects to callback with error=access_denied. GoogleAuthGuard must catch this and return a 401 rather than crashing.
2. **Email conflict** — Google profile email already exists as a local user. Return 409 Conflict with a descriptive message; never merge accounts silently.
3. **Missing email from Google** — GoogleStrategy.validate() must throw UnauthorizedException if profile has no email.
4. **Duplicate providerId** — Prisma @unique on providerId prevents DB-level duplicates. The initial findByProviderId lookup handles this first.
5. **Invalid/expired state parameter** — passport-google-oauth20 validates state automatically when state:true; mismatched state results in 403.
6. **Callback URL mismatch** — GOOGLE_CALLBACK_URL must match the URL registered in Google Console. Validated via env vars at boot time.
7. **Concurrent first-time logins** — Two simultaneous OAuth callbacks for the same new email could race. Catch Prisma P2002 (unique constraint error) in googleLogin and retry with findByEmail to return the existing user.

---

## 5. Implementation Plan

1. **Install dependencies** — add passport-google-oauth20 and @types/passport-google-oauth20.
2. **Update Prisma schema** — make passwordHash nullable; add provider String @default("local") and providerId String? @unique to User.
3. **Generate and apply migration** — run pnpm prisma migrate dev --name add-sso-provider-fields. Verify existing rows are unaffected.
4. **Update env validation** — add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL to the Zod schema in env.validation.ts as required strings.
5. **Add env vars** — add placeholder entries to .env.example. Add real values to .env (not committed).
6. **Add findByProviderId to UsersRepository** — findUnique({ where: { providerId } }).
7. **Create GoogleStrategy** — new file src/auth/strategies/google.strategy.ts. Reads credentials from ConfigService, sets state:true, extracts profile fields in validate().
8. **Create GoogleAuthGuard** — new file src/auth/guards/google-auth.guard.ts. Extends AuthGuard("google"). Overrides handleRequest to catch access_denied and throw UnauthorizedException.
9. **Refactor AuthService** — extract private issueTokens(user: User). Add async googleLogin(profile: GoogleProfile) with the lookup-or-create logic and P2002 race-condition handling.
10. **Add endpoints to AuthController** — GET /auth/google (apply GoogleAuthGuard) and GET /auth/google/callback (apply GoogleAuthGuard, call googleLogin, set cookie, return AuthResponseDto).
11. **Register GoogleStrategy in AuthModule** — add to providers array.
12. **Expose provider in UserResponseDto** — add @Expose() provider field.
13. **Write tests** — unit tests for AuthService.googleLogin() (all branches) and GoogleStrategy.validate().

---

## 6. Implementation Order

1. Install passport-google-oauth20 and @types/passport-google-oauth20
2. Update Prisma schema (passwordHash nullable, provider, providerId)
3. Run and apply Prisma migration
4. Update env.validation.ts with Google OAuth env vars
5. Add env var placeholders to .env.example
6. Add findByProviderId() to UsersRepository
7. Create GoogleStrategy (src/auth/strategies/google.strategy.ts)
8. Create GoogleAuthGuard (src/auth/guards/google-auth.guard.ts)
9. Refactor AuthService — extract issueTokens(), add googleLogin()
10. Add GET /auth/google and GET /auth/google/callback to AuthController
11. Register GoogleStrategy in AuthModule
12. Expose provider field in UserResponseDto
13. Write unit tests for GoogleStrategy.validate() and AuthService.googleLogin()

---

## 7. Task Breakdown

- [ ] Install passport-google-oauth20 and @types/passport-google-oauth20
- [ ] Make passwordHash nullable in prisma/schema.prisma
- [ ] Add provider String @default("local") to User model
- [ ] Add providerId String? @unique to User model
- [ ] Run pnpm prisma migrate dev --name add-sso-provider-fields
- [ ] Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL to env.validation.ts Zod schema
- [ ] Add Google env var placeholders to .env.example
- [ ] Add findByProviderId(providerId: string) to UsersRepository
- [ ] Create src/auth/strategies/google.strategy.ts with GoogleStrategy
- [ ] Create src/auth/guards/google-auth.guard.ts with GoogleAuthGuard
- [ ] Extract issueTokens(user: User) helper in AuthService
- [ ] Add googleLogin(profile: GoogleProfile) to AuthService with lookup-or-create logic
- [ ] Handle P2002 race condition in googleLogin() with fallback findByEmail
- [ ] Add GET /auth/google endpoint to AuthController (redirect trigger)
- [ ] Add GET /auth/google/callback endpoint to AuthController (set cookie, return DTO)
- [ ] Register GoogleStrategy in AuthModule providers
- [ ] Expose provider field in UserResponseDto
- [ ] Write unit tests for GoogleStrategy.validate() — happy path and missing email
- [ ] Write unit tests for AuthService.googleLogin() — new user, returning user, email conflict, race condition
