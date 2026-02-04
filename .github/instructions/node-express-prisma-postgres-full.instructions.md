---
description: 'Production-ready instructions for Node.js + Express + TypeScript + Prisma + PostgreSQL APIs'
applyTo: '**/*.ts, **/*.tsx, prisma/**, src/**'
---

# Node.js + Express + TypeScript + Prisma + PostgreSQL

**Stack:** Node.js 18+ | Express | TypeScript strict | Prisma ORM | PostgreSQL 12+ | Zod | Jest | bcrypt | JWT  
**Principles:** Layered architecture | Type safety first | Security by default | Separation of concerns | Production ready  
**Target:** >80% test coverage | Zero secrets committed | All migrations version-controlled | Automated CI/CD

## Architecture & Layered Structure

| Layer | Responsibilities | Rules |
|-------|-----------------|-------|
| **Controllers** | HTTP concerns (request/response), thin layer | No business logic |
| **Services** | Business logic, orchestration | No HTTP types (Express Request/Response) |
| **Repositories** | Data access, Prisma queries, DTO mapping | Single Prisma instance only |
| **Middleware** | Cross-cutting (auth, logging, errors, rate limiting) | Reusable across routes |
| **Validators** | Zod schemas, input validation, type inference | At API boundary |

**Project Structure:**
```
├─ src/
│  ├─ server.ts
│  ├─ app.ts
│  ├─ config/
│  │  ├─ env.ts
│  │  ├─ auth.ts
│  │  ├─ cors.ts
│  │  └─ logger.ts
│  ├─ controllers/
│  │  ├─ auth.controller.ts
│  │  └─ user.controller.ts
│  ├─ services/
│  │  ├─ auth.service.ts
│  │  └─ user.service.ts
│  ├─ repositories/
│  │  └─ user.repository.ts
│  ├─ middleware/
│  │  ├─ auth.middleware.ts
│  │  ├─ error.middleware.ts
│  │  └─ rateLimit.middleware.ts
│  ├─ validators/
│  │  ├─ auth.validator.ts
│  │  └─ user.validator.ts
│  ├─ routes/
│  │  ├─ index.ts
│  │  └─ v1/
│  │     ├─ auth.routes.ts
│  │     └─ user.routes.ts
│  ├─ prisma/
│  │  └─ client.ts
│  └─ tests/
│     ├─ unit/
│     └─ integration/
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
└─ .env.example
```

**Separation Rules:**
- ✅ Controllers → Services → Repositories (one-way flow)
- ✅ Middleware is reusable across routes
- ❌ Never Controllers → Repositories (bypass services)
- ❌ Never business logic in Controllers
- ❌ Never HTTP types in Services
- ❌ Never multiple Prisma instances

## TypeScript Configuration

**Essential tsconfig.json:**
- Enable `strict: true` for type safety
- Set `noImplicitAny: true`, `noUncheckedIndexedAccess: true`, `strictNullChecks: true`
- Use `target: ES2020`, `module: commonjs`
- Enable `esModuleInterop: true`

**Best Practices:**
- Declare explicit return types on exported functions
- Avoid `any` types; use `unknown` with type guards
- Configure ESLint to enforce consistent imports and promise handling

## Application Setup

**Express App Structure:**
1. Apply security middleware first (helmet, CORS)
2. Add logging middleware (morgan/winston)
3. Configure body parsing with size limits (10mb)
4. Apply rate limiting to API routes
5. Mount versioned routes (`/api/v1`, `/api/v2`)
6. Add health check endpoint (`/health`)
7. Apply error handler last (must be final middleware)

**Server Entry Point:**
- Listen on configured PORT (default 3000)
- Implement graceful shutdown for SIGTERM/SIGINT
- Disconnect Prisma client on shutdown
- Handle unhandled rejections and uncaught exceptions
- Log startup information and environment

**Environment Configuration:**
- Use Zod to validate environment variables at startup
- **Require:** DATABASE_URL, JWT_SECRET (min 32 chars), NODE_ENV
- **Defaults:** PORT, JWT_EXPIRY, ALLOWED_ORIGINS, LOG_LEVEL
- Fail fast if required variables are missing

## Input Validation & Error Handling

**Zod Validation:**
- Request body validation with type coercion
- Query parameter validation
- Environment variable validation
- Type inference from schemas
- Create reusable validate middleware

**Custom Error Class:**
- Extend Error with statusCode, code, and optional details
- Use for all application errors
- Support different HTTP status codes

**Centralized Error Middleware:**
- Check if error is AppError instance
- Return consistent JSON error format
- Hide internal errors in production (log only)
- Include error details in development only
- Never expose stack traces to clients in production

**Prisma Error Mapping:**
- **P2002** (unique constraint) → **409** Conflict
- **P2025** (record not found) → **404** Not Found
- Map other Prisma errors → **500** Database Error
- Log all database errors with context

## Authentication & Authorization

**JWT Implementation:**
- Store JWT_SECRET in environment (never commit)
- Use bcrypt with salt rounds ≥10 for passwords
- Generate separate access tokens (24h) and refresh tokens (7d)
- Return user data without password field

**Authentication Middleware:**
- Extract Bearer token from Authorization header
- Verify token signature and expiry
- Attach decoded user to request object
- Extend Express Request type for user property

**Authorization Middleware:**
- Create role-based authorization middleware
- Accept allowed roles as parameters
- Query user role from database
- Return 401 for missing auth, 403 for insufficient permissions

**Protected Routes:**
- **Public:** `/auth/register`, `/auth/login`
- **Authenticated:** `/profile` (requires valid token)
- **Admin only:** `/users` (requires admin role)

**Security Best Practices:**
- Use HTTPS in production for token transmission
- Implement token blacklisting for logout
- Add rate limiting on auth endpoints (5 attempts per 15 min)
- Never expose password fields in responses
- Hash passwords before storing

## Logging & Monitoring

**HTTP Logging (Morgan):**
- Use `dev` format in development for readable output
- Use custom format in production with request body (sanitized)
- Filter sensitive fields (password, token) from logs
- Skip health check endpoints to reduce noise

**Structured Logging (Winston):**
- Log to files in production (error.log, combined.log)
- Log to console in development with colors
- Use JSON format for production (machine-readable)
- Include timestamp and service name in all logs
- Set log level via environment (info, warn, error, debug)

**Error Logging:**
- Log all unexpected errors with stack trace
- Include request path and method in error logs
- Use structured logging for easy querying

## API Configuration & Security

**Versioning Strategy:**
- Use URL path versioning (`/api/v1`, `/api/v2`)
- Create separate route modules per version
- Keep health check unversioned
- Document version differences and deprecation timeline

**CORS Configuration:**
- Define allowed origins in environment variable (comma-separated)
- Allow requests with no origin (mobile apps, Postman)
- Enable credentials for cookie-based auth
- Restrict methods to: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Allow headers: Content-Type, Authorization
- Set maxAge to 24 hours for preflight caching

**Rate Limiting:**
- Use Redis store in production for distributed rate limiting
- Set general API limit: 100 requests per 15 minutes
- Set stricter auth limit: 5 attempts per 15 minutes
- Skip successful auth requests from count
- Return 429 with clear error message
- Use in-memory store for development only

**Security Headers (Helmet):**
- Enable Content Security Policy with restrictive directives
- Set HSTS with max age 1 year, includeSubDomains, preload
- Configure frame options to prevent clickjacking
- Disable X-Powered-By header

## Security (OWASP Top 10)

**A01 - Broken Access Control:**
- ✅ Implement role-based authorization middleware
- ✅ Validate user permissions on every protected endpoint
- ✅ Never trust client-side access control
- ✅ Use JWT with short expiration times (24h max)
- ✅ Validate resource ownership before operations
- ✅ Deny by default; explicitly allow access
- ✅ Log all authorization failures for monitoring

**A02 - Cryptographic Failures:**
- ✅ Use bcrypt with salt rounds ≥10 for password hashing
- ✅ Store JWT_SECRET in environment (minimum 32 characters)
- ✅ Use HTTPS/TLS in production for all communications
- ✅ Never log or expose sensitive data (passwords, tokens, PII)
- ✅ Encrypt sensitive data at rest in database
- ✅ Use strong cryptographic algorithms (avoid MD5, SHA1)
- ✅ Rotate secrets regularly and have rotation strategy

**A03 - Injection:**
- ✅ Prisma uses parameterized queries by default (SQL injection safe)
- ✅ Never use raw SQL queries unless absolutely necessary
- ✅ If using `prisma.$queryRaw`, always use tagged templates with variables
- ✅ Validate all input with Zod schemas before processing
- ✅ Sanitize user input for special characters
- ✅ Use allowlists for dynamic query parameters (sorting, filtering)
- ✅ Avoid string concatenation in queries
- ✅ Implement input length limits to prevent buffer overflows
- ✅ Never use `$queryRawUnsafe` with user input

**A04 - Insecure Design:**
- ✅ Implement rate limiting on all public endpoints
- ✅ Add stricter limits on authentication endpoints (5/15min)
- ✅ Use captcha for sensitive operations
- ✅ Implement account lockout after failed login attempts
- ✅ Add email verification for new accounts
- ✅ Require re-authentication for sensitive operations
- ✅ Design with security from the start, not as afterthought

**A05 - Security Misconfiguration:**
- ✅ Disable detailed error messages in production
- ✅ Remove default accounts and sample data
- ✅ Keep dependencies updated (npm audit fix)
- ✅ Configure CORS to allow only trusted origins
- ✅ Disable directory listing and unnecessary HTTP methods
- ✅ Use security headers (Helmet with strict CSP)
- ✅ Set secure cookie flags (httpOnly, secure, sameSite)
- ✅ Configure proper database user permissions (principle of least privilege)

**A06 - Vulnerable Components:**
- ✅ Run `npm audit` regularly in CI/CD pipeline
- ✅ Use Dependabot or Renovate for automated updates
- ✅ Review security advisories for critical dependencies
- ✅ Pin dependency versions in package-lock.json
- ✅ Remove unused dependencies
- ✅ Monitor for zero-day vulnerabilities
- ✅ Have update and patching strategy

**A07 - Authentication Failures:**
- ✅ Implement multi-factor authentication for sensitive accounts
- ✅ Use strong password requirements (min 8 chars, complexity)
- ✅ Implement password reset with secure tokens (expiring)
- ✅ Prevent credential stuffing with rate limiting
- ✅ Use secure session management (JWT with refresh tokens)
- ✅ Implement account lockout after 5 failed attempts
- ✅ Log all authentication events
- ✅ Never expose which field failed (username vs password)

**A08 - Data Integrity Failures:**
- ✅ Verify npm package integrity (package-lock.json)
- ✅ Use signed commits in Git
- ✅ Implement CI/CD pipeline with security checks
- ✅ Verify database backups regularly
- ✅ Use checksums for critical data
- ✅ Implement audit logging for data changes
- ✅ Validate data integrity in transactions

**A09 - Logging/Monitoring Failures:**
- ✅ Log all authentication attempts (success and failure)
- ✅ Log authorization failures with user context
- ✅ Monitor for suspicious patterns (failed logins, rate limit hits)
- ✅ Use structured logging (Winston with JSON format)
- ✅ Centralize logs (CloudWatch, ELK, Datadog)
- ✅ Set up alerts for security events
- ✅ Retain logs for compliance (minimum 90 days)
- ✅ Never log sensitive data (passwords, tokens, credit cards)

**A10 - Server-Side Request Forgery (SSRF):**
- ✅ Validate and sanitize all URLs from user input
- ✅ Use allowlists for external API calls
- ✅ Disable redirects or validate redirect targets
- ✅ Implement network segmentation
- ✅ Use separate credentials for external services
- ✅ Validate response content types
- ✅ Set timeout limits for external requests

**Additional Security Best Practices:**
- Set body parser limits to prevent DoS (10mb for JSON, 50mb for uploads)
- Configure appropriate limits per endpoint type
- Validate and sanitize with Zod (email, trim, max length)
- Use validator library for additional sanitization when needed
- Escape special characters for XSS prevention
- Set httpOnly flag to prevent XSS attacks
- Use secure flag for HTTPS only in production
- Set sameSite to 'strict' for CSRF protection
- Configure appropriate maxAge (24 hours recommended)
- Create separate database users for application (not superuser)
- Grant only necessary permissions (SELECT, INSERT, UPDATE, DELETE)
- Use read replicas for reporting queries
- Enable query logging in production for audit
- Implement row-level security for multi-tenant applications
- Regular backup and test restore procedures

## Pagination

**Cursor-Based (Recommended):**
- Best for large datasets and real-time data
- Fetch limit + 1 items to check for next page
- Skip cursor item itself when provided
- Return: items, nextCursor, hasNextPage
- Order by indexed column for performance

**Offset-Based (Simple):**
- Use for smaller datasets or admin panels
- Calculate skip from page and pageSize
- Run count query in parallel with data query
- Return: items, page, pageSize, total, totalPages, hasNextPage, hasPrevPage
- Slower for large offsets

**Controller Pattern:**
- Validate pagination params with Zod (coerce strings to numbers)
- Set sensible defaults (limit: 20, page: 1)
- Enforce maximum limits to prevent abuse

## Database Transactions

**When to Use Transactions:**
- Multiple related operations must succeed or fail together
- Updating multiple tables that depend on each other
- Financial operations requiring atomicity (transfers, payments)
- Creating parent and child records simultaneously
- Updating aggregates and detail records together
- Operations requiring data consistency guarantees

**Transaction Types:**

| Type | Use Case | Implementation |
|------|----------|----------------|
| **Sequential (Simple)** | Multiple independent operations, all must succeed | Pass array to `$transaction()` |
| **Interactive (Complex)** | Conditional logic, read-then-write patterns, business logic | Full Prisma client in callback |

**Transaction Isolation Levels:**
- Prisma uses database default isolation level
- PostgreSQL default: Read Committed
- Can configure in DATABASE_URL: `?isolationLevel=Serializable`
- Higher isolation = better consistency but lower concurrency
- Balance between data integrity and performance

**Best Practices:**
- Keep transactions short and focused
- Avoid external API calls within transactions (hold database locks)
- Don't perform file I/O or slow operations inside transactions
- Set reasonable timeouts to prevent indefinite locks
- Handle deadlocks with retry logic (exponential backoff)
- Use optimistic locking for concurrent updates (version fields)
- Log transaction failures with full context for debugging
- Test transaction rollback scenarios
- Monitor transaction duration in production

**Error Handling:**
- Catch and handle Prisma errors specifically
- Distinguish between validation errors and database errors
- Implement retry logic for deadlock errors (P2034)
- Never swallow transaction errors silently
- Log rollback events for audit trail
- Provide meaningful error messages to clients

**Optimistic Concurrency Control:**
- Add version field to models requiring concurrent updates
- Increment version on each update
- Include current version in WHERE clause when updating
- Throw error if version doesn't match (record was modified)
- Retry with fresh data on conflicts
- Good for: inventory, account balances, booking systems

**Performance Considerations:**
- Long transactions increase lock contention
- Avoid SELECT queries that aren't needed for the transaction
- Use database indexes on columns in WHERE clauses
- Consider read replicas for read-heavy operations (outside transactions)
- Monitor slow transaction queries
- Set connection pool size appropriately for transaction load
- Test transaction performance under load

**Nested Writes vs Transactions:**
- Use Prisma nested writes for simple parent-child relationships
- Nested writes are automatically transactional
- Use explicit transactions for complex multi-model operations
- Nested writes have cleaner syntax but less control
- Transactions provide more flexibility for business logic

## Testing Strategy

**Unit Tests:**
- Test services and utilities in isolation
- Mock Prisma client with jest.mock
- Mock external dependencies
- Test business logic thoroughly
- Aim for >80% coverage

**Integration Tests:**
- Test full request/response cycle with supertest
- Use separate test database
- Run migrations before tests
- Clean up data after each test
- Test authentication and authorization flows

**Test Database:**
- Set DATABASE_URL_TEST environment variable
- Use transactions with rollback for test isolation
- Implement proper cleanup in afterEach/afterAll hooks
- Seed test data consistently

**Test Organization:**
- Separate unit and integration tests
- Use descriptive test names
- Group related tests with describe blocks
- Test edge cases and error conditions

## Prisma Configuration

**Shared Instance:**
- Create single PrismaClient instance (singleton pattern)
- Export from `src/prisma/client.ts`
- Never create multiple instances (causes connection exhaustion)

**Connection Resilience:**
- Implement retry logic with exponential backoff (5 retries)
- Wait increasing intervals between retries (5s, 10s, 15s...)
- Exit process if unable to connect after retries
- Call `$connect()` explicitly at startup

**Configuration:**
- Enable query logging in development only
- Configure connection pool in DATABASE_URL (`?connection_limit=10`)
- Add connection timeout (`?connect_timeout=10`)
- Set pool timeout (`?pool_timeout=20`)

**Graceful Shutdown:**
- Listen for SIGTERM and SIGINT signals
- Close HTTP server first
- Disconnect Prisma client
- Exit with code 0
- Log shutdown steps

**Schema Best Practices:**
- Add `@id @default(autoincrement())` for primary keys
- Add `@unique` constraints on email and similar fields
- Include `createdAt DateTime @default(now())`
- Include `updatedAt DateTime @updatedAt`
- Use enums for fixed value sets (UserRole, Status, etc.)
- Define proper relation cascades (`onDelete: Cascade`)
- Add `@@index([field])` on frequently queried columns
- Add composite indexes for common query combinations
- Index foreign keys for join performance

**Migration Workflow:**
- **Local Development:** Use `prisma migrate dev` to create and apply migrations
- **Production Deployment:** NEVER use `migrate dev` in production, always use `prisma migrate deploy`
- Name migrations descriptively: `--name add_user_roles`
- Review generated SQL before applying
- Test migrations on sample data
- Run migrations before deploying new code
- Test migrations on staging environment first
- Never modify existing migration files after deployment
- Include rollback strategy for destructive changes

**CI/CD Pipeline Order:**
1. Install dependencies (`npm ci`)
2. Generate Prisma Client (`prisma generate`)
3. Run migrations (`prisma migrate deploy`)
4. Run linting and type checks
5. Run tests
6. Build application
7. Deploy

## CI/CD Pipeline

**GitHub Actions Workflow Stages:**
1. Code Quality & Linting (ESLint, Prettier, TypeScript strict mode)
2. Security Scanning (`npm audit`, Snyk, Dependabot)
3. Build & Type Checking (compile TypeScript, generate Prisma client)
4. Database Migrations (test environment)
5. Automated Testing (unit, integration, E2E)
6. Build Artifacts
7. Deployment (staging → production)

**Trigger Configuration:**
- Push to main branch (auto-deploy to production)
- Pull requests to main (run tests, no deploy)
- Manual workflow dispatch for emergency deployments
- Scheduled runs for security scans
- Tag creation for versioned releases

**Environment Setup:**
- Node.js version matrix (18.x, 20.x)
- PostgreSQL service container for tests
- Redis service container for integration tests
- Cache npm dependencies for faster builds
- Parallel job execution where possible

**Required Secrets:**
- DATABASE_URL (per environment)
- JWT_SECRET (production secret)
- REDIS_URL (for production)
- ALLOWED_ORIGINS (production domains)
- Cloud provider credentials
- APM and monitoring service keys

**Pipeline Best Practices:**
- Cache node_modules between runs
- Run jobs in parallel (lint, test, build)
- Use Docker layer caching
- Skip redundant steps on PR updates
- Retry flaky tests (max 2 retries)
- Use service containers for dependencies
- Isolate test environments
- Use GitHub OIDC for cloud authentication
- Rotate secrets regularly

## Deployment

**Multi-Stage Dockerfile:**
- **Stage 1 (dependencies):** Install all dependencies including devDependencies
- **Stage 2 (build):** Compile TypeScript, generate Prisma client, run build scripts
- **Stage 3 (production):** Copy only production files, use minimal base image
- Use Alpine or Distroless for smaller images (<200MB)
- Run as non-root user for security
- Include health check instruction

**Docker Best Practices:**
- Use `.dockerignore` (exclude node_modules, .git, tests, coverage, .env)
- Layer caching: Copy package files before source code
- Pin specific versions (avoid `latest` tags)
- Multi-platform builds (amd64, arm64)
- Scan images for vulnerabilities

**Kubernetes Deployment:**
- **Deployment:** Manage application pods (min 2 replicas)
- **Service:** Expose application (LoadBalancer or ClusterIP)
- **ConfigMap:** Store non-sensitive configuration
- **Secret:** Store DATABASE_URL, JWT_SECRET (base64 encoded)
- **Ingress:** HTTP/HTTPS routing and TLS termination
- **HorizontalPodAutoscaler:** Auto-scale based on CPU/memory
- Resource requests: CPU 100m, Memory 256Mi
- Resource limits: CPU 500m, Memory 512Mi
- Rolling update strategy (maxSurge: 1, maxUnavailable: 0)
- Liveness probe: GET /health (delay: 30s, period: 10s)
- Readiness probe: GET /health/ready (delay: 5s, period: 5s)

**Cloud Platform Options:**
- **AWS:** ECS Fargate, EKS, RDS PostgreSQL, ElastiCache Redis, CloudWatch
- **GCP:** Cloud Run, GKE Autopilot, Cloud SQL, Memorystore, Cloud Logging
- **Azure:** Container Apps, AKS, Azure Database for PostgreSQL, Azure Cache for Redis

**Database Deployment:**
- Use managed database service (RDS, Cloud SQL, Azure Database)
- Enable automated backups (daily, 7-30 day retention)
- Configure high availability (multi-AZ or regional)
- Set up read replicas for read-heavy workloads
- Enable SSL/TLS connections
- Configure appropriate instance size

**Deployment Strategies:**
- **Blue-Green:** Maintain two identical environments, switch traffic after validation
- **Canary:** Deploy to 5-10% of servers first, gradually increase traffic
- **Rolling Update:** Update pods one at a time, wait for health checks

**Health Checks & Monitoring:**
- Liveness: Application is running
- Readiness: Application can serve traffic
- Startup: Initial startup completion
- Check database connectivity
- Verify external dependencies
- Automated rollback on health check failures

## Observability & Monitoring

**Distributed Tracing:**
- Instrument Express with OpenTelemetry SDK
- Auto-instrumentation for HTTP, Prisma, external calls
- Export traces to Jaeger, Zipkin, Datadog, or cloud providers
- Trace context propagation across microservices
- Custom spans for business-critical operations
- Generate unique request ID (UUID v4)
- Attach to request context in middleware
- Include in all log entries
- Propagate via X-Request-ID header

**APM Solutions:**
- **Datadog APM:** Full-stack observability, auto-instrumentation
- **New Relic:** Real user monitoring, error tracking
- **Dynatrace:** AI-powered performance analysis
- **Elastic APM:** Open-source, correlates with logs
- **AWS X-Ray:** Distributed tracing for AWS services

**Key Metrics:**
- Request rate (requests per second)
- Response time percentiles (p50, p95, p99)
- Error rate by endpoint and error type
- Database query performance
- External API call latencies
- Memory usage and GC patterns
- CPU utilization
- Business metrics (orders, payments, signups)
- Feature usage tracking
- Cache performance metrics

**Structured Logging:**
- JSON format for machine readability
- Include: timestamp, level, service, requestId, userId
- HTTP context: method, path, statusCode, duration
- Error details: message, stack, code
- Sanitize sensitive data (passwords, tokens, PII)
- **ERROR:** Application failures, exceptions
- **WARN:** Degraded performance, fallback usage
- **INFO:** Business events, state transitions
- **DEBUG:** Detailed execution flow (dev/staging only)

**Log Aggregation:**
- Centralized logging: ELK Stack, CloudWatch, Datadog, Splunk
- Query by requestId, userId, error codes
- Set retention policies (30-90 days)
- Archive to object storage (S3, GCS)
- Real-time log streaming for debugging

**Alerting:**
- **Critical Alerts (Immediate):** Service down, Error rate >5%, Response time p95 >1s, Database connection failures, Memory usage >90%
- **Warning Alerts (Action Required):** Error rate >1%, Response time degradation, Cache hit rate <80%, Disk space <20%, Certificate expiring <30 days
- **Info Alerts (Monitoring):** Deployment notifications, Scaling events, Circuit breaker state changes, Rate limit hits
- Escalation policies (Slack → PagerDuty)
- Alert grouping and deduplication
- Silence periods for maintenance
- Runbooks linked to alerts

## API Documentation (Swagger/OpenAPI)

**Why Document APIs:**
- Reduces onboarding time for new developers
- Enables API consumers to self-serve
- Provides interactive testing environment
- Serves as living documentation (always up-to-date)
- Facilitates API contract testing
- Supports code generation for clients
- Improves collaboration between frontend and backend teams

**Essential Dependencies:**
- `swagger-jsdoc` - Generate OpenAPI spec from JSDoc comments
- `swagger-ui-express` - Serve interactive Swagger UI
- `@types/swagger-jsdoc`, `@types/swagger-ui-express` - TypeScript types
- Alternative: `tsoa` - TypeScript-first framework with automatic OpenAPI generation

**Swagger Configuration:**
- Define API info: title, version, description, contact
- Set base path and server URLs (dev, staging, production)
- Configure security schemes (Bearer JWT)
- Define common response schemas
- Group endpoints by tags (Users, Auth, Products, etc.)
- Set up at `/api-docs` route
- Disable in production or protect with authentication

**Documentation Strategy:**
- **Route-Level:** Document HTTP method, endpoint purpose, parameters, request/response schemas, authentication requirements
- **Schema Documentation:** Define reusable component schemas, document all fields with types, mark required vs optional fields, provide example values
- **Authentication:** Define security schemes, document auth flow, specify which endpoints require authentication, include example tokens
- **Examples:** Provide realistic request examples, include multiple response examples (success and errors), show pagination examples, document edge cases

**Best Practices:**
- **Consistency:** Use consistent naming conventions, standardize response formats, apply consistent parameter naming, use standard HTTP status codes
- **Completeness:** Document all public endpoints, include all possible error responses, document rate limiting behavior, specify pagination parameters
- **Maintainability:** Keep documentation close to code (JSDoc comments), generate docs automatically in CI/CD, review documentation in code reviews
- **User Experience:** Organize endpoints logically with tags, provide clear descriptions, include helpful examples, add usage notes and warnings

**Integration with Zod:**
- Generate OpenAPI schemas from Zod validators
- Use `zod-to-json-schema` for automatic conversion
- Ensures request validation matches documentation
- Single source of truth for validation and docs
- Reduces documentation drift

**Documentation Security:**
- Protect production API docs with authentication
- Don't expose internal implementation details
- Sanitize example data (no real user data)
- Document security considerations
- Include rate limiting information
- Hide sensitive endpoints from public docs

**Automated Testing:**
- Validate OpenAPI spec in CI/CD pipeline
- Test that documented endpoints exist
- Verify response schemas match documentation
- Check that examples are valid
- Ensure all endpoints are documented

## Essential Dependencies

**Core:**
- `express` - Web framework
- `@prisma/client` - ORM client
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT authentication
- `zod` - Runtime validation
- `cors` - CORS configuration
- `helmet` - Security headers
- `morgan` - HTTP logging
- `express-rate-limit` - Rate limiting
- `winston` - Structured logging

**Development:**
- `typescript`, `@types/*` - Type definitions
- `ts-node-dev` - Development server
- `jest`, `supertest` - Testing
- `eslint`, `prettier` - Code quality
- `prisma` - Database tooling

**Production Optional:**
- `ioredis`, `rate-limit-redis` - Redis-backed rate limiting
- `swagger-jsdoc`, `swagger-ui-express` - API documentation

## Anti-Patterns to Avoid

**❌ Multiple Prisma Client Instances**
- DON'T: Create PrismaClient instances in multiple files
- ✅ DO: Use single shared instance from `src/prisma/client.ts`

**❌ Business Logic in Controllers**
- DON'T: Hash passwords, validate business rules in controllers
- ✅ DO: Delegate to service layer

**❌ Exposing Prisma Errors to Clients**
- DON'T: Return raw database errors to clients
- ✅ DO: Map to user-friendly AppError

**❌ Running `migrate dev` in Production**
- DON'T: Use `npm run migrate:dev` in production/CI
- ✅ DO: Use `migrate:deploy` for production

**❌ Committing Secrets**
- DON'T: Hard-code JWT_SECRET, DATABASE_URL in code
- ✅ DO: Use environment variables and secret management

**❌ Missing Input Validation**
- DON'T: Trust user input without validation
- ✅ DO: Validate with Zod schemas

**❌ Ignoring N+1 Query Problems**
- DON'T: Loop through users to fetch posts individually
- ✅ DO: Use `include` or `select` for relations

## Troubleshooting Guide

**Connection Pool Exhaustion:**
- **Symptom:** "Can't reach database server" errors
- **Solution:** Ensure single Prisma instance, configure pool size, monitor connections

**Migration Failures in CI:**
- **Symptom:** Permission errors or conflicts
- **Solution:** Verify DATABASE_URL, check user permissions, ensure migrations are committed

**Type Mismatches After Schema Changes:**
- **Symptom:** TypeScript errors after Prisma changes
- **Solution:** Run `prisma generate`, restart TS server, clear `node_modules/.prisma`

**Performance Issues:**
- **Symptom:** Slow API responses
- **Solution:** Enable query logging, add indexes, use `select` to limit fields, check for N+1

**Test Database Issues:**
- **Symptom:** Tests interfering with each other
- **Solution:** Use transactions with rollback, proper cleanup, separate test DB

**Authentication Failures:**
- **Symptom:** Valid tokens rejected
- **Solution:** Verify JWT_SECRET matches, check token expiry, ensure Bearer format

## Pre-Deployment Checklist

**Security:**
- [ ] All secrets stored in environment variables/secrets manager
- [ ] HTTPS/TLS enabled with valid certificate
- [ ] Rate limiting configured on all endpoints
- [ ] Input validation implemented with Zod
- [ ] Authentication and authorization working correctly
- [ ] Error messages don't expose sensitive information
- [ ] Security headers configured (Helmet)
- [ ] CORS configured with specific origins
- [ ] Dependencies scanned with npm audit
- [ ] Database user has minimal required permissions
- [ ] Logging configured without sensitive data

**Database:**
- [ ] Single shared Prisma client instance
- [ ] All migrations committed and reviewed
- [ ] Migration pipeline uses `prisma migrate deploy`
- [ ] Connection pool configured appropriately
- [ ] SSL/TLS enabled for database connections
- [ ] Backup procedures tested

**Testing:**
- [ ] Unit tests achieve >80% coverage
- [ ] Integration tests cover critical workflows
- [ ] Test database separate from development
- [ ] CI/CD pipeline runs all tests
- [ ] Performance tests for critical paths

**Infrastructure:**
- [ ] Health check endpoints implemented
- [ ] Graceful shutdown handling
- [ ] Monitoring and alerting configured
- [ ] Log aggregation set up
- [ ] Disaster recovery plan documented
- [ ] Auto-scaling policies configured

## Quick Start

**Initial Setup:**
- Clone repository and install dependencies
- Copy `.env.example` to `.env`
- Configure: DATABASE_URL, JWT_SECRET, JWT_EXPIRY, ALLOWED_ORIGINS, etc.
- Run `npm run prisma:generate`
- Run `npm run migrate:dev`
- Start development server with `npm run dev`

**Development Workflow:**
- After schema changes: `npm run migrate:dev -- --name descriptive_name`
- Run tests: `npm run test` and `npm run test:coverage`
- Code quality: `npm run lint`, `npm run typecheck`, `npm run format`
- Production build: `npm run build` then `npm start`

**Common Commands:**
- `npx prisma studio` - Open database GUI
- `npx prisma migrate reset` - Reset database (dev only)
- `npx prisma db seed` - Run seed script

## Key Principles

1. **Type Safety First:** Use TypeScript strict mode, Zod validation, Prisma types
2. **Security by Default:** Helmet, CORS, rate limiting, JWT, input validation
3. **Separation of Concerns:** Controllers → Services → Repositories
4. **Single Responsibility:** Each layer has one clear purpose
5. **Fail Fast:** Validate environment and inputs at startup
6. **Explicit Over Implicit:** Clear error messages, typed returns
7. **Production Ready:** Logging, monitoring, graceful shutdown, error handling
8. **Test Everything:** >80% coverage, unit + integration tests
9. **Never Trust Input:** Validate and sanitize all external data
10. **Scalability Aware:** Pagination, caching, connection pooling, API versioning

---

*Build production-ready APIs with confidence—security, performance, and maintainability from day one.*
