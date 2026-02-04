---
description: 'HTTP/API layer: Controllers, routes, middleware, security, validation, logging, and API design.'
applyTo: 'src/app.ts, src/server.ts, **/controllers/**, **/routes/**, **/middleware/**'
---

# Node.js + Express — API Layer

**Stack:** Node.js 18+, TypeScript strict, Express, Zod, Jest  
**Principles:** Thin controllers → Services → Repositories | Security-first | Type-safe | Observable  
**Target:** >80% coverage, secure secrets, production-ready

**Target:** >80% coverage, secure secrets, production-ready

## Architecture

**Layer Responsibilities:**

| Layer | Input | Output | Responsibility |
|-------|-------|--------|----------------|
| Controller | Validated request | HTTP response | Status codes, headers, `{ data, meta }` shape |
| Service | DTOs | Domain objects/DTOs | Business logic, orchestration, transactions |
| Repository | DTOs | Plain JSON/models | CRUD, queries, DB operations |
| Middleware | Request context | Modified req/res | Auth, validation, logging, rate limits |

**Rules:** Controllers → Services only (never skip to repositories) | Validate at boundaries | DI for testability

**Project Structure:**
```
src/
├── api/v1/              # Version-specific
│   ├── controllers/     # HTTP handlers
│   ├── routes/          # Route definitions
│   └── schemas/         # Zod validators
├── services/            # Business logic
├── repositories/        # Data access
├── middleware/          # Reusable middleware
├── lib/                 # Errors, logging, utils
├── config/              # Env validation
├── app.ts               # Express setup
└── server.ts            # Entry point
```

## Middleware Pipeline (Critical Order)

**Apply in exact sequence:**
1. **Security:** helmet, cors (env-configured origins)
2. **Logging:** morgan, winston (HTTP + structured)
3. **Parsing:** Body parser (10MB JSON, 50MB uploads)
4. **Rate Limiting:** 100/15min API, 5/15min auth
5. **Routing:** Versioned /api/v1, /api/v2
6. **Health Check:** /health (unversioned, skip logging)
7. **Error Handler:** Centralized (MUST BE LAST)

## Configuration

**Environment Variables (Zod-validated at startup):**

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| DATABASE_URL | ✅ | — | Connection string |
| JWT_SECRET | ✅ | — | Min 32 chars |
| NODE_ENV | ✅ | — | development/production |
| PORT | ❌ | 3000 | Server port |
| ALLOWED_ORIGINS | ❌ | * | Comma-separated (no * in prod) |
| LOG_LEVEL | ❌ | info | debug/info/warn/error |

**Server Lifecycle:**
- **Startup:** Validate env → Connect DB → Listen → Log
- **Shutdown (SIGTERM/SIGINT):** Stop new requests → Drain → Disconnect DB → Exit
- **Error:** Catch unhandled rejections/exceptions → Log → Exit non-zero

## Validation & Error Handling

**Zod Validation:**
- Apply at API boundaries (body, query, params)
- Type coercion for pagination (strings → numbers)
- Defaults + max limits (limit: 20, max: 100)
- Reusable validation middleware
- Length limits, allowlists for dynamic params

**AppError Pattern:**
- Structure: statusCode, code, message, details?
- Centralized middleware (last in chain)
- JSON response: `{ error: { code, message, details? } }`
- Hide internals in prod (log server-side only)
- Include path, method, userId in logs

**HTTP Status Codes:**
- 200: Success | 201: Created | 204: No content
- 400: Bad input | 401: Missing/invalid auth | 403: Insufficient permissions
- 404: Not found | 409: Conflict | 429: Rate limited
- 500: Internal | 503: Unavailable

## Security

**CORS:**
- Origins: Env variable (comma-separated, no wildcards in prod)
- Credentials: Enabled
- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Headers: Content-Type, Authorization
- Preflight cache: 24h

**Rate Limiting (Redis in prod):**
- General API: 100 req/15min
- Auth endpoints: 5 req/15min
- Return 429 with Retry-After header
- In-memory for dev

**Helmet Security Headers:**
- CSP with restrictive directives
- HSTS: 1 year, includeSubDomains, preload
- Frameguard: deny (prevent clickjacking)
- Disable X-Powered-By

**JWT Authentication:**
- Extract Bearer token in middleware
- Verify signature and expiry
- Attach decoded user to typed Request
- 401: Missing/invalid | 403: Insufficient permissions
- Production: HTTPS only, token blacklisting

**OWASP Top 10 Compliance:**
- **A01 Access Control:** JWT middleware, RBAC, permission validation, log failures
- **A02 Cryptography:** HTTPS/TLS, JWT_SECRET 32+ chars, no sensitive exposure
- **A03 Injection:** Zod validation, Prisma parameterized queries, input sanitization
- **A04 Secure Design:** Rate limiting, account lockout, timeouts
- **A05 Misconfiguration:** Hide errors in prod, CORS restrictions, Helmet headers
- **A06 Components:** npm audit in CI, Dependabot, version pinning
- **A07 Auth Failures:** Strong passwords, MFA, secure tokens, lockout after 5 fails
- **A08 Data Integrity:** Audit logging, checksums, transaction validation
- **A09 Logging:** Structured logs, auth tracking, PII filtering, centralized
- **A10 SSRF:** URL validation, allowlists, timeout limits

## Logging & Observability

**HTTP Logging (Morgan):**
- Dev: `dev` format (readable)
- Prod: Custom JSON (sanitized)
- Skip /health endpoints
- Filter sensitive fields (password, token)

**Structured Logging (Winston):**
- Prod: File rotation (error.log, combined.log)
- Dev: Colorized console
- Format: JSON with timestamp, requestId, service, level
- **Log:** ✅ Auth attempts, errors (path, method, user, stack), request IDs
- **Never log:** ❌ Passwords, tokens, PII, credit cards

**Distributed Tracing:**
- Generate UUID requestId per request
- Attach to req.id in early middleware
- Include in all logs, propagate to downstream (X-Request-ID header)
- OpenTelemetry for auto-instrumentation (HTTP, DB, external)
- Custom spans for business-critical operations

**Health Checks:**
- `GET /health`: Liveness (returns 200)
- `GET /health/ready`: Readiness (DB, Redis, dependencies)
- Return 503 if critical dependency down
- Exclude from logging and rate limiting

**Monitoring Alerts:**
- Error rate >5% | Response time p95 >1s
- Connection pool exhaustion | Memory >80%
- Rate limit spikes | Health check failures
- Certificate expiration (30 days)

## API Design

**Versioning:**
- URL path: /api/v1, /api/v2
- Keep /health unversioned
- Document version differences and deprecation

**Pagination:**
- **Cursor-based (recommended):** `{ cursor, limit }` → `{ items, nextCursor, hasNextPage }`
- **Offset-based (simple):** `{ page, pageSize }` → full metadata with totals
- Validate with Zod, enforce max limits, use indexed columns

**Documentation:**
- Serve OpenAPI/Swagger at /api-docs (protect in prod)
- Generate from Zod schemas (zod-to-json-schema)
- Document endpoints, params, responses, errors, auth

**Response Format:**
- Success: `{ data: T, meta?: Pagination }`
- Error: `{ error: { code, message, details? } }`

## Caching

**HTTP Headers:**
- Public: `Cache-Control: public, max-age=3600`
- Private: `Cache-Control: private, max-age=300`
- Sensitive: `Cache-Control: no-store`
- ETag: Hash response, return 304 if unchanged

**In-Memory:**
- Cache expensive computations (aggregations, reports)
- Set TTL based on freshness
- Memory limit: 100MB max
- Invalidation: Time-based, event-based, pattern-based

**Redis (Production):**
- Session storage, JWT blacklist, rate limits
- Key naming: `{service}:{resource}:{id}`
- Set TTL on all keys
- Monitor hit rates (target >80%)

**Compression:**
- gzip/Brotli for responses >1KB
- Exclude images, videos (already compressed)
- Level 4-6 for speed/size balance
- CDN for static assets

## Testing

**Integration Tests (Supertest):**
- Test auth, validation, rate limiting, pagination
- Focus on edge cases and error scenarios
- Isolated test database

**Coverage Targets:**
- Controllers/middleware: >80%
- Critical flows: E2E tests
- Unit tests for utilities

## TypeScript

**tsconfig.json:**
- strict: true, noImplicitAny: true, strictNullChecks: true
- target: ES2020, module: commonjs, esModuleInterop: true

**Best Practices:**
- Explicit return types on exported functions
- Avoid any, use unknown with type guards
- Type handlers consistently

## Dependencies

**Core:** express, cors, helmet, morgan, winston, express-rate-limit, ioredis, rate-limit-redis, zod, jsonwebtoken, swagger-ui-express

**Dev:** typescript, @types/*, ts-node-dev, jest, supertest, eslint, prettier

## Pre-Deployment Checklist

- [ ] Middleware in correct order (Security → Logging → Parsing → Rate Limiting → Routes → Error Handler)
- [ ] Versioned routes (/api/v1), health endpoint (/health)
- [ ] Environment validated at startup (Zod)
- [ ] Rate limiting: 100/15min API, 5/15min auth
- [ ] CORS with specific origins (no wildcards in prod)
- [ ] Helmet headers enabled
- [ ] HTTPS/TLS enforced
- [ ] Secrets in env vars (never committed)
- [ ] Sensitive data excluded from logs
- [ ] Error middleware last
- [ ] Graceful shutdown implemented
- [ ] Monitoring and alerts configured
- [ ] TypeScript strict passing
- [ ] Test coverage >80%
- [ ] API docs protected/disabled in prod

## Quick Reference

**Controller Pattern:**
1. Validate input (Zod at boundary)
2. Call service with typed DTOs
3. Return `{ data, meta? }`
4. Let error middleware handle exceptions

**Middleware Order:** Security → Logging → Parsing → Rate Limiting → Routes → Error Handler

**APM Integration:** Datadog (ddtrace-js), New Relic (newrelic), Dynatrace (OneAgent), Elastic APM (elastic-apm-node)

**Key Metrics:** Request rate, response time (p50, p95, p99), error rate, throughput, DB performance, external API latency, memory, CPU
