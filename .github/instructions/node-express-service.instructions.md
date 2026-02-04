---
description: 'Business/service layer rules and conventions for Node + TypeScript (services, validators, auth orchestration, authorization).'
applyTo: '**/services/**, **/validators/**, **/controllers/**'
---

# Node.js + Express — Service Layer

**Stack:** Node.js 18+ | TypeScript strict | Express | Zod | Jest | Prisma | bcrypt | JWT  
**Principles:** Clean architecture | Layer isolation | Testability | Type safety | Security-first  
**Target:** ≥80% test coverage | Zero Express types in services | Transaction safety | Comprehensive error handling

## Architecture & Separation of Concerns
 
**Folder structure**

```
src/
├── app.ts                  # Express app + route wiring (controllers use services)
├── config/                 # Env and config loaders
├── controllers/            # HTTP layer: request/response, call services
│   └── user.controller.ts
├── services/               # Business logic, orchestration, transactions
│   └── user.service.ts
├── repositories/           # Prisma queries, DB access (consumed by services)
│   └── user.repository.ts
├── validators/             # Zod schemas / runtime validation
│   └── user.validator.ts
├── middleware/             # Auth, error handling, rate limiting
├── types/                  # Shared DTOs and domain types
├── utils/                  # Pure helpers and small utilities
└── routes/                 # Route definitions (wire controllers)
```

**Layer Responsibilities & Communication:**

| Layer | Responsibilities | Communication |
|-------|-----------------|---------------|
| **Controllers** | Parse HTTP requests, call services, transform responses, handle HTTP concerns | → Services only |
| **Services** | Business logic, orchestration, transaction management, authorization | → Repositories, → Other Services |
| **Repositories** | Database operations, Prisma queries, DTO mapping, data errors | Consumed by Services |
| **Validators** | Zod schemas, runtime validation, type inference | API boundary |

**Layer Rules:**
- ✅ Controllers → Services → Repositories (one-way flow)
- ✅ Services compose other services for complex workflows
- ❌ Never Controllers → Repositories (bypass services)
- ❌ Never Repositories → Services (inverted dependency)

**Service Layer Responsibilities:**
- Orchestrate operations across repositories, APIs, and services
- Enforce business rules and domain-specific validations
- Manage transaction boundaries and rollback logic
- Implement authentication orchestration and authorization checks
- Handle error scenarios with AppError mapping
- Independent of HTTP/transport layer (no Express types)

**Anti-Patterns to Avoid:**
- ❌ Express types (Request, Response) in service signatures
- ❌ Direct database access (use repositories)
- ❌ Returning Prisma models (return DTOs without sensitive fields)
- ❌ Business logic in controllers
- ❌ Logging/returning sensitive data (passwords, tokens)
- ❌ Mutable state in service instances

## Validation & Types

**Schema Validation with Zod:**
- Define validation schemas at API boundary (`validators/`)
- Infer service input/output types from Zod schemas
- Services perform defensive validation on critical inputs only
- Separate domain validation from API request schemas

**Type Safety:**
- Service functions accept explicit parameter objects (never Express Request/Response)
- Return plain DTOs that serialize cleanly to JSON
- Use discriminated unions for complex return types
- Prefer `unknown` with type guards over `any`
- Define explicit return types on all exported functions
- Use readonly types for immutable data

**Input Sanitization:**
- Trim and normalize strings (whitespace, case)
- Validate and normalize emails to lowercase
- Enforce length limits on text fields
- Use allowlists for enum-like values
- Sanitize before logging (remove sensitive fields)

## Error Handling

**AppError Structure:**
- Throw typed AppError for expected failures: `AppError(statusCode, code, message, optionalDetails)`
- Use semantic codes: `USER_NOT_FOUND`, `DUPLICATE_EMAIL`, `INSUFFICIENT_PERMISSIONS`
- Provide actionable client messages
- Include debug details (sanitized, production-excluded)

**Error Mapping:**
- Map database errors to domain errors
- **P2002** (unique constraint) → **409** Conflict + field name
- **P2025** (not found) → **404** Not Found
- **P2034** (deadlock) → **503** Service Unavailable + retry hint
- Wrap external API errors with context and correlation IDs

**Logging:**
- Log at service boundaries (method, user ID, sanitized params)
- Never log sensitive data (passwords, tokens, PII, credit cards)
- Include correlation IDs for distributed tracing
- Log full stack traces for unexpected errors
- Use structured logging (JSON)

## Authentication & Authorization

**Authentication Pattern:**
- Middleware handles token parsing (not services)
- Services accept `userId` or `user` object as parameters
- Verify user exists and is active before critical operations
- Hash passwords with bcrypt (saltRounds ≥ 10)
- Never return password hashes or tokens in responses
- Implement consistent error messages (prevent user enumeration)

**Authorization at Service Layer:**
- Implement RBAC helpers for role checks
- Verify resource ownership before mutations
- Evaluate permissions contextually (user can perform action on resource)
- Throw AppError: **401** (unauthenticated), **403** (insufficient permissions)
- Log authorization failures with context

**JWT & Token Management:**
- Centralize token operations in auth service
- Use JWT_SECRET from environment (never hardcode)
- Issue short-lived access tokens (15m-24h) and long-lived refresh tokens (7d-30d)
- Implement token blacklisting for logout
- Validate signature, expiration, and payload structure

**Security Best Practices:**
- Account lockout after failed attempts (5-10 attempts)
- Log all authentication events
- Use generic error messages (don't reveal which credential failed)
- Rate limiting for auth endpoints (middleware)
- Idempotency tokens for critical operations
- Multi-factor authentication for sensitive operations

## Transactions & Concurrency

**Transaction Decision Criteria:**

| Use Transactions | Skip Transactions |
|-----------------|-------------------|
| Multiple related writes (atomic) | Single table operation |
| Financial operations (transfers, payments) | Read-only operations |
| Parent-child record creation | Independent writes |
| Cross-table consistency required | External API calls involved |

**Transaction Types:**
- **Sequential:** Multiple independent operations, all succeed or rollback: `prisma.$transaction([op1, op2, op3])`
- **Interactive:** Conditional logic within transaction scope, full Prisma access, set timeout 5-15s: `prisma.$transaction(async (tx) => { ... }, { timeout })`

**Transaction Best Practices:**
- Keep transactions short-lived (minimize lock duration)
- Never make external API calls within transactions
- Avoid file I/O, email sends, slow operations inside
- Set reasonable timeouts (5-15s)
- Implement retry logic with exponential backoff for deadlocks
- Log failures with full context
- Test rollback scenarios

**Optimistic Concurrency Control:**
- Add `version` field to models requiring concurrent updates
- Increment version on each update
- Include current version in WHERE clause
- Throw **409 Conflict** if version mismatch
- **Use cases:** inventory, account balances, bookings, counters

**Concurrency Patterns:**
- Use optimistic locking for high contention resources
- Implement retry logic for transient failures
- Test concurrent update scenarios
- Monitor deadlock frequency and transaction duration

## Security (OWASP Top 10 - Service Layer)

**A01 - Broken Access Control:**
- Verify permissions before every sensitive operation
- Validate resource ownership before mutations
- Implement RBAC checks
- Log authorization failures
- Deny-by-default approach

**A02 - Cryptographic Failures:**
- Hash passwords with bcrypt (saltRounds ≥ 10, recommend 12)
- Never return hashes, tokens, secrets
- Sanitize sensitive data before logging
- Use secure random generators (crypto.randomBytes)
- Encrypt sensitive data at rest

**A03 - Injection:**
- Validate all inputs defensively
- Use Prisma parameterized queries (inherently safe)
- Sanitize special characters
- Use allowlists for dynamic parameters
- Never concatenate user input into queries

**A04 - Insecure Design:**
- Implement idempotency for critical operations
- Design with failure scenarios in mind
- Implement circuit breakers for external dependencies
- Retry logic with exponential backoff
- Timeouts for all external calls

**A07 - Authentication Failures:**
- Account lockout after failed attempts (5-10)
- Enforce strong password requirements
- Validate session/token on every protected operation
- Generic error messages
- Progressive delays on failed attempts

**A08 - Data Integrity Failures:**
- Validate data integrity within transactions
- Audit logging for sensitive operations
- Use checksums for critical data
- Test rollback scenarios
- Version control for important records

**Additional Security:**
- Enforce input length limits
- Service-level rate limiting for expensive operations
- Constant-time comparison for sensitive data
- Validate file uploads (type, size, content)
- Data retention and deletion policies (GDPR)

## Testing

**Unit Testing Strategy:**
- Mock repositories and external services using Jest
- Keep tests fast and deterministic (no real database)
- Focus on business rules and edge cases
- Test error handling paths thoroughly

**Integration Testing:**
- Run against test database with migrations
- Use dedicated TEST_DATABASE_URL
- Seed known data before tests
- Clean up or use transactions with rollback

**Coverage Goals:**
- Target ≥80% coverage on service layer
- 100% coverage on critical paths (payments, auth, financial)
- Focus on edge cases: empty inputs, boundaries, null handling, concurrent access
- Test error scenarios and recovery paths
- Test transaction rollback and retry behavior

**Best Practices:**
- Descriptive test names (BDD style)
- Arrange-Act-Assert pattern
- One behavior per test
- Factory functions for complex test data
- Mock external dependencies
- Test success and failure paths
- Avoid test interdependencies

## Circuit Breaker Pattern

**When to Use:**
- External API calls (payment gateways, third-party services)
- Microservice communication
- Database queries to secondary systems
- File storage operations (S3, cloud storage)
- Email/SMS providers

**Benefits:**
- Prevent cascading failures
- Fail fast instead of waiting for timeouts
- Automatic recovery when service restores
- Reduce load on failing dependencies

**States:**
- **Closed (Normal):** Requests pass through, track failures, transition to Open if threshold exceeded
- **Open (Failing Fast):** Reject immediately, return fallback/cached data, wait for timeout
- **Half-Open (Testing):** Allow limited requests to test recovery

**Configuration:**
- Failure threshold: 50% failures in window
- Measurement window: 10-60s
- Timeout duration: 30-60s (Open state)
- Half-open max attempts: 3-5
- Request timeout: 5-30s per call

**Libraries:** `opossum`, `cockatiel`, `brakes`

**Fallback Strategies:**
- Return cached data
- Return default/empty response
- Throw graceful error with retry-after
- Queue for later processing
- Use alternative service/endpoint

**Monitoring:**
- Current state (Closed/Open/Half-Open)
- Failure/success rate
- Request volume and rejection rate
- Mean response time
- State transition events

## Caching Strategies

**When to Cache at Service Layer:**
- Expensive computations (aggregations, reports)
- Frequently accessed reference data
- User session data and preferences
- External API responses
- Database query results (read-heavy)
- Authorization/permission checks

**Cache Patterns:**
- **Cache-Aside:** Check cache → on miss fetch from DB → populate cache → set TTL
- **Write-Through:** Write to cache and DB simultaneously (consistency)
- **Write-Behind:** Write to cache immediately, async write to DB (performance)

**Redis Implementation:**
- **Key Design:** Prefix with service name: `userService:profile:{userId}`, include version: `v1:user:{id}`
- **Invalidation:** Time-based (TTL), event-based (on mutations), pattern-based (SCAN/DEL)
- **Cache Warming:** Pre-populate critical data, warm after deployments

**In-Memory Caching:**
- Node-Cache / LRU Cache for frequently used data
- Memory-bound with size limits
- Use for: configuration, feature flags, permissions

**Best Practices:**
- Cache stampede prevention (locking, stale-while-revalidate, jitter)
- Eventual consistency acceptable for most caches
- Version data to prevent stale reads
- Monitor hit rates and staleness
- Cache only serializable data (JSON)
- Compress large values
- Use batch operations

## Observability

**Distributed Tracing:**
- Propagate trace context from controllers
- Create spans for each service method
- Tag spans with business context (userId, orderId)
- Record method parameters (sanitized)
- Track external calls and DB queries

**Service Metrics:**
- **Business:** Transaction volume, success/failure rates, processing times, resource utilization
- **Technical:** Method call rates, response times (p50, p95, p99), error rates, retry frequency, circuit breaker states, cache hit/miss
- **Performance:** DB query times, API latencies, transaction duration, lock contention, memory allocation

**Structured Logging:**
- Log service method entry/exit
- Include correlation IDs
- Log errors with full stack traces
- Record business event outcomes
- Track state transitions

**Alerting:**
- High error rate (>5% of operations)
- Response time degradation (p95 >500ms)
- Circuit breaker opened
- Cache performance degradation
- Transaction failure spikes
- External dependency failures

## Service Conventions

**Function Signature Principles:**
- Accept explicit parameter objects (named parameters)
- Return plain DTOs (JSON-serializable, no ORM types)
- Never use Express Request/Response types
- Use async/await consistently
- Define explicit return types
- Use readonly types for immutable parameters

**Best Practices:**
- Small, focused services (avoid god-service objects)
- Group related operations
- Stateless design (no instance variables)
- Dependency injection (constructor parameters)
- Document side effects (JSDoc)
- Single responsibility per method
- Composition over inheritance

**Code Organization:**
- One service per domain entity (UserService, OrderService)
- Shared logic in utility services
- Complex workflows in orchestrator services
- Keep services in `src/services/`
- Co-locate service tests

## Essential Dependencies

**Core:** `zod` (validation), `bcrypt` (password hashing), `jsonwebtoken` (JWT), `@prisma/client` (database)

**Optional:** `ioredis` (caching), `uuid` (IDs), `date-fns` (date/time), `validator` (string validation), `axios` (HTTP client)

**Dev:** `jest` (testing), `@types/bcrypt`, `@types/jsonwebtoken`, `@types/jest`

## Pre-Deployment Checklist

**Service Layer:**
- [ ] Services have typed inputs/outputs (Zod schemas)
- [ ] Business rules tested (≥80% coverage)
- [ ] Transactions handle multi-step operations
- [ ] Errors are AppError instances
- [ ] No Express types in service signatures
- [ ] Password hashing uses bcrypt (saltRounds ≥ 10)
- [ ] Sensitive data excluded from logs/responses
- [ ] Authorization checks before mutations
- [ ] Optimistic locking for concurrent updates
- [ ] Integration tests cover critical workflows

**Testing:**
- [ ] Unit tests mock repositories/external services
- [ ] Integration tests against test database
- [ ] Edge cases and boundaries tested
- [ ] Error scenarios and recovery paths tested
- [ ] Transaction rollback verified
- [ ] Concurrent access scenarios tested
- [ ] Test data factories implemented

**Security:**
- [ ] All inputs validated and sanitized
- [ ] Authorization before sensitive operations
- [ ] Idempotency for critical operations
- [ ] Sensitive operations logged (no sensitive data)
- [ ] Account lockout for failed auth attempts
- [ ] Retry logic with exponential backoff

---

*Service layer is the heart of business logic—keep it clean, tested, and independent of infrastructure concerns.*
