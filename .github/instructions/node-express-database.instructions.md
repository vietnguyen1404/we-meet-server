---
description: 'Data layer guidance: Prisma schema, repositories, migrations, DB config, transactions and CI migration rules.'
applyTo: 'prisma/**, **/repositories/**, prisma/schema.prisma, prisma/migrations/**'
---

# Node.js + Express — Database / Persistence Layer

**Stack:** PostgreSQL 12+ | Prisma ORM | Node.js 18+ | TypeScript strict  
**Principles:** Repository pattern | Single Prisma instance | Migration-first | Type-safe DTOs | Security-first  
**Target:** Zero direct Prisma access outside repositories | All migrations version-controlled | SSL enabled | Optimized connection pool

## Architecture & Separation of Concerns

**Folder structure**
```
prisma/
├── schema.prisma          # Database schema definition
├── migrations/            # Migration files (auto-generated)
│   ├── 20231201000000_init/
│   │   └── migration.sql
│   └── migration_lock.toml
└── seed.ts                # Database seeding script (optional)

src/
├── prisma/
│   └── client.ts          # Shared Prisma client instance
├── repositories/          # Data access layer
└── types/                 # Generated and custom types
```

**Layer Responsibilities and Rules:**
| Layer | Responsibilities | Rules |
|-------|-----------------|-------|
| **Prisma Client** | Connection pool, query builder, lifecycle management | Single shared instance only |
| **Repositories** | Encapsulate queries, map to DTOs, translate errors, transaction helpers | Never expose Prisma models directly |
| **Migrations** | Version-controlled schema changes, CI/CD automation | Never edit applied migrations |
| **DTOs** | Plain TypeScript interfaces, exclude sensitive fields, decouple schema from API | Type-safe data exchange |

**Layer Communication Rules:**
- ✅ Services → Repositories → Prisma Client (one-way flow)
- ❌ Never Services → Prisma Client (bypass repositories)
- ❌ Never Controllers → Repositories (bypass services)
- ❌ Never multiple Prisma Client instances (connection exhaustion)

**Data Flow:**
1. Service calls repository with typed parameters
2. Repository constructs Prisma query
3. Prisma executes against database
4. Repository maps Prisma model to DTO
5. Repository returns DTO to service

## Prisma Client Management

**Single Instance Pattern:**
- Export single shared PrismaClient from `src/prisma/client.ts`
- Call `$connect()` at application startup
- Call `$disconnect()` on graceful shutdown (SIGTERM/SIGINT)
- **Never** create multiple instances (causes pool exhaustion)
- Import and reuse same instance throughout app

**Client Configuration:**
- Configure logging by environment (verbose in dev, errors only in prod)
- Set connection pool size via DATABASE_URL parameters
- Enable query logging in development for debugging
- Disable detailed logs in production for performance

**Connection Lifecycle:**
- **Startup:** Connect once during initialization
- **Runtime:** Reuse same client for all operations
- **Shutdown:** Disconnect gracefully to close connections
- Implement retry with exponential backoff (max 5 attempts)
- Fail fast after retry limit
- Log connection events (connect, disconnect, errors)

**Connection Pool Configuration:**
- Configure via DATABASE_URL: `?connection_limit=10&connect_timeout=30`
- **Default:** 10 connections (suitable for most apps)
- **Formula:** `pool_size = (core_count × 2) + effective_spindle_count`
- **Production:** 10-20 connections per app instance
- Monitor pool usage in production
- Set appropriate timeouts to prevent hanging
- Adjust based on concurrent load and DB capacity

## Repository Pattern

**Repository Responsibilities:**
- Encapsulate all Prisma queries behind clean interface
- Return plain DTOs (never expose Prisma models)
- Map Prisma errors to domain errors (AppError)
- Provide transaction helpers for complex operations
- Keep methods focused and single-purpose
- Implement consistent error handling

**Method Signatures:**
- Use explicit return types (never implicit `any`)
- Accept strongly-typed input parameters
- Return DTOs or null (for optional queries)
- Use async/await consistently
- Document expected errors in JSDoc

**Best Practices:**
- Use `select` to limit fields and reduce payload
- Use `include` sparingly (only when relations needed)
- Avoid N+1 queries (use `include` or batch loading)
- Map Prisma models to DTOs immediately
- **Never** expose passwords, tokens, or sensitive data
- Handle Prisma errors and map to AppError
- Implement pagination helpers (cursor and offset)
- Use consistent naming: `findById`, `findMany`, `create`, `update`, `delete`

**Data Mapping Strategy:**
- Define mapper functions: `toDomainDTO(prismaModel)`
- Exclude sensitive fields explicitly (passwords, tokens)
- Transform dates to ISO strings if needed
- Flatten nested structures for API responses
- Keep mapping logic close to repository
- Use TypeScript for compile-time safety

## Prisma Schema Design

**Schema Guidelines:**
- Use `@id @default(autoincrement())` for primary keys (or `cuid()` for distributed)
- Add `@unique` constraints for natural unique fields (email, username, slug)
- **Always** include `createdAt DateTime @default(now())`
- **Always** include `updatedAt DateTime @updatedAt`
- Use enums for fixed value sets (UserRole, Status, Priority)
- Add `@@index` on fields used in WHERE/ORDER BY
- Use `@@index([field1, field2])` for composite queries
- Add foreign key constraints for referential integrity
- Document complex business rules in comments

**Indexing Strategy:**
- Index frequently queried columns (WHERE clause fields)
- Index sort columns (ORDER BY fields)
- Index foreign keys (join performance)
- Composite indexes for multi-column queries
- Monitor slow queries and add indexes incrementally
- Avoid over-indexing (slows writes)
- Use EXPLAIN to validate index usage
- Remove unused indexes periodically

**Relationship Design:**
- Define relationships explicitly with `@relation`
- Use appropriate cardinality: 1:1, 1:N, N:M (join tables)
- **Cascade deletes:** Use cautiously (`onDelete: Cascade`)
- **Soft deletes:** Use `deletedAt DateTime?` for important data
- `onDelete: SetNull` or `Restrict` for critical references
- Document relationship business rules

**Field Type Selection:**
- **Int/BigInt:** IDs, counters, quantities
- **String:** Text, emails, names (specify `@db.VarChar(255)`)
- **DateTime:** Timestamps (stored as UTC)
- **Boolean:** Flags, statuses
- **Decimal:** Monetary values (avoid Float for money)
- **Json:** Flexible schemas, metadata, configuration
- **Enum:** Fixed value sets with type safety

## Transactions & Concurrency

**Transaction Decision Matrix:**

| Use Transactions | Skip Transactions |
|-----------------|-------------------|
| Multiple related writes (atomic) | Single table operation |
| Financial operations (transfers, payments) | Read-only queries |
| Parent-child record creation | Independent writes |
| Cross-table consistency required | External API calls involved |

**Transaction Types:**
- **Sequential:** Array of operations, all succeed or rollback: `prisma.$transaction([op1, op2, op3])`
- **Interactive:** Full Prisma access, conditional logic, set timeout 5-15s: `prisma.$transaction(async (tx) => { ... }, { timeout })`

**Transaction Isolation Levels:**
- Prisma uses database default isolation level
- **PostgreSQL default:** Read Committed
- **MySQL default:** Repeatable Read
- Configure via DATABASE_URL: `?isolationLevel=Serializable`
- **Trade-off:** Higher isolation = better consistency, lower concurrency

**Best Practices:**
- Keep transactions short-lived (minimize lock duration)
- **Never** make external API calls within transactions
- **Avoid** file I/O, email sends, slow operations inside
- Set reasonable timeouts (5-15s)
- Implement retry logic with exponential backoff for deadlocks
- Log transaction failures with full context
- Test rollback scenarios in integration tests
- Monitor transaction duration and deadlock frequency
- Use consistent lock ordering to prevent deadlocks

**Optimistic Concurrency Control:**
- Add `version` field to models requiring concurrent updates
- Increment version on each update
- Include current version in WHERE clause
- Throw **409 Conflict** if version mismatch
- Client retries with fresh data
- **Use cases:** inventory, account balances, bookings, counters
- Alternative: database-level locks for pessimistic concurrency

**Error Handling:**
- Catch Prisma errors specifically (use error codes)
- Distinguish validation from transient database errors
- Implement retry logic for deadlock errors (**P2034**)
- **Never** swallow transaction errors silently
- Log rollback events with context for audit
- Provide meaningful error messages to clients

## Prisma Error Mapping

**Common Error Codes:**

| Prisma Code | HTTP Status | Description |
|-------------|-------------|-------------|
| **P2002** | 409 Conflict | Unique constraint violation + field name |
| **P2025** | 404 Not Found | Record not found |
| **P2034** | 503 Service Unavailable | Transaction deadlock + retry hint |
| **P2003** | 400 Bad Request | Foreign key constraint + relation details |
| **P2014** | 400 Bad Request | Relation violation |
| **P2024** | 503 Service Unavailable | Connection timeout |

**Error Mapping Implementation:**
- Map Prisma errors in repository layer
- Extract field information from error metadata (`error.meta`)
- Include actionable error messages for clients
- Preserve error chain for debugging (`error.cause`)
- Log full Prisma error context (sanitized)
- Never expose internal database structure

**Logging Best Practices:**
- Log full database error context (code, message, metadata)
- Include sanitized query parameters (remove sensitive data)
- **Never** log passwords, tokens, PII, credit cards
- Include correlation/request IDs for distributed tracing
- Log error patterns for anomaly detection
- Use structured logging (JSON)

## Migrations

**Migration Workflow:**

**Local Development:**
- Create: `prisma migrate dev --name descriptive_migration_name`
- Review generated SQL in `prisma/migrations/`
- Test against local database
- Commit migration files to version control
- **Never** delete or modify applied migrations

**CI/CD Pipeline:**
- Install dependencies: `npm ci`
- Generate Prisma client: `prisma generate` (before migrations)
- Run migrations: `prisma migrate deploy` (production-safe)
- Run tests against migrated database
- Build application

**Production Deployment:**
- Use `prisma migrate deploy` exclusively (applies pending migrations)
- Run migrations before deploying new code
- Monitor migration execution time
- Have rollback plan ready

**Best Practices:**
- **Always** review generated SQL before committing
- Test migrations on staging environment first
- **Never** edit applied migration files (create new migration)
- Separate data migrations from schema migrations
- **Zero-downtime deployment strategy:**
  1. Add new column as nullable
  2. Deploy code writing to both old and new columns
  3. Backfill data with background job
  4. Deploy code reading from new column
  5. Make column required and drop old column
- Backup database before major migrations
- Document breaking changes in migration comments
- Version control all migrations
- Test rollback procedures

**Migration Safety Checklist:**
- [ ] Migration SQL reviewed and understood
- [ ] Migration tested on staging database
- [ ] Database backup created
- [ ] Zero-downtime strategy implemented (if needed)
- [ ] Backward compatibility considered
- [ ] Rollback plan documented
- [ ] Team notified of changes

## Database Security

**Access Control:**
- Create dedicated app database user (never use superuser/root)
- Grant minimum permissions: SELECT, INSERT, UPDATE, DELETE on specific tables
- Restrict DDL operations (CREATE, ALTER, DROP) to dedicated migration user
- Use read-only credentials for read replicas and reporting
- Implement row-level security (RLS) for multi-tenant apps
- Audit database user permissions quarterly
- Follow principle of least privilege

**Connection Security:**
- **Production:** Use SSL/TLS for all connections (`?sslmode=require`)
- Store connection strings in environment variables (never commit)
- Use secrets manager in production (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault)
- Rotate database credentials regularly (90-day policy)
- Monitor for unauthorized connection attempts
- Use connection pooling to limit exposure
- Whitelist application server IPs (firewall rules)

**Data Protection:**
- Enable database encryption at rest (native DB features)
- Hash passwords with bcrypt (saltRounds ≥ 10) before storage
- **Never** store plain text passwords, tokens, or API keys
- Encrypt backups (filesystem or backup tool encryption)
- Test backup restore procedures regularly (quarterly)
- Implement data retention policies (GDPR compliance)
- Enable audit logging for sensitive table access
- Use soft deletes for critical data (retain for recovery)

**SQL Injection Prevention:**
- Prisma uses parameterized queries by default ✅ (inherently safe)
- **Avoid** raw SQL queries unless absolutely necessary
- If using `$queryRaw`, use tagged templates: `` prisma.$queryRaw`SELECT * FROM users WHERE id = ${id}` ``
- **Never** use `$queryRawUnsafe` with user input (high risk)
- Validate and sanitize all user inputs
- Use allowlists for dynamic table/column names
- Implement input length limits

**Security Checklist:**
- [ ] Application user has minimal permissions
- [ ] SSL/TLS enabled for production connections
- [ ] Credentials stored in secrets manager
- [ ] Passwords hashed with bcrypt (saltRounds ≥ 10)
- [ ] Database encryption at rest enabled
- [ ] Backup encryption configured
- [ ] Backup/restore procedures tested
- [ ] Audit logging enabled for sensitive tables
- [ ] Row-level security implemented (multi-tenant apps)
- [ ] SQL injection prevention verified (no `$queryRawUnsafe` with user input)

## Performance Optimization

**Query Optimization:**
- Use `select` to limit fields and reduce payload
- Avoid N+1 queries: use `include` for relations or batch with `findMany`
- Ensure WHERE clause columns are indexed
- Use cursor-based pagination for large datasets (better performance)
- Use offset pagination (`take`/`skip`) for small datasets only
- Enable slow query logging in database (threshold: 1-2s)
- Analyze query plans with EXPLAIN for optimization
- Use `distinct` carefully (expensive operation)

**Connection Pool Tuning:**
- **Formula:** `pool_size = (core_count × 2) + effective_spindle_count`
- Default: 10 connections (suitable for most apps)
- Production: 10-20 connections per app instance
- Monitor connection utilization metrics
- Set appropriate timeouts: `connect_timeout=30`, `pool_timeout=10`
- Use read replicas for read-heavy workloads (separate pool)
- Implement connection retry with exponential backoff
- Scale horizontally (more app instances) vs. vertically (larger pool)

**Caching Strategies:**
- Cache frequently read, infrequently updated data
- Use Redis for distributed caching (multi-instance apps)
- Implement cache invalidation on writes (cache-aside pattern)
- Cache at repository layer for reusability
- Monitor cache hit rate (target: 80%+)
- Set appropriate TTL based on data volatility
- Use cache warming for critical queries
- Consider read-through caching for complex queries

## Testing with Database

**Test Database Setup:**
- Use dedicated test database: `DATABASE_URL_TEST`
- Run migrations before tests: `prisma migrate deploy --schema=./prisma/schema.prisma`
- Seed known test data with fixtures
- Isolate tests (clean data between tests or use transactions)
- Use in-memory database (SQLite) for fast unit tests
- Use real database (PostgreSQL) for integration tests

**Test Strategies:**
- **Unit Tests (Repository Layer):** Mock Prisma client, test logic without DB, fast execution (milliseconds), focus on data mapping and error handling
- **Integration Tests:** Run against real test database, verify actual DB interactions, test migrations and schema correctness, validate transaction behavior, test concurrent access scenarios, verify indexes and query performance

**Test Isolation Patterns:**
- **Transaction rollback:** Wrap each test in transaction, rollback after
- **Truncate tables:** Delete all data between tests
- **Recreate database:** Drop and recreate for each test suite
- Use factories/fixtures for consistent test data
- Clean up in `afterEach` or `afterAll` hooks
- Avoid test interdependencies

## Observability

**Database Query Monitoring:**
- Enable Prisma query logging in development
- Log slow queries (>100ms threshold)
- Track query execution frequency
- Monitor N+1 query patterns
- Record query parameter patterns

**Prisma Logging Configuration:**
- `log: ['query', 'error', 'warn']` for development
- `log: ['error']` for production (performance)
- Custom logging middleware for detailed tracking
- Structured logs with query context
- Include duration and affected rows

**Connection Pool Monitoring:**
- Active connections count
- Idle connections count
- Waiting requests queue size
- Connection acquisition time
- Connection timeout events
- Pool exhaustion incidents

**Transaction Metrics:**
- Transaction duration (p50, p95, p99)
- Transaction success/failure rates
- Rollback frequency and causes
- Deadlock detection and frequency
- Lock wait times

**Health Checks:**
- Simple connectivity: `SELECT 1`
- Response time measurement
- Connection pool availability
- Replica lag monitoring (read replicas)
- Database version and uptime

**Alert Conditions:**
- Connection failures
- Response time >200ms
- Pool exhaustion
- Replica lag >5 seconds
- Disk space <20%
- High error rate (>5% of operations)
- Transaction failure spikes

**Performance Profiling Tools:**
- PostgreSQL pg_stat_statements extension
- Query execution plan analysis (EXPLAIN)
- Index usage statistics
- Table bloat monitoring
- Vacuum and analyze scheduling

## Pre-Deployment Checklist

**Development:**
- [ ] Single shared Prisma client exported from `src/prisma/client.ts`
- [ ] Repository pattern implemented for all data access
- [ ] Migration files committed to version control and reviewed
- [ ] Schema includes appropriate indexes on queried columns
- [ ] All models have `createdAt` and `updatedAt` fields
- [ ] Sensitive fields (passwords, tokens) excluded from DTOs
- [ ] Prisma errors mapped to AppError with context
- [ ] Transactions implemented for multi-step operations
- [ ] Data mappers defined (Prisma models → DTOs)

**CI/CD:**
- [ ] Migrations run using `prisma migrate deploy` (never `migrate dev`)
- [ ] Prisma client generated before migrations (`prisma generate`)
- [ ] Test database configured separately (DATABASE_URL_TEST)
- [ ] Migrations executed before tests in CI pipeline
- [ ] Integration tests cover repository layer thoroughly
- [ ] Connection pool configured appropriately
- [ ] Database connection retry logic implemented

**Production:**
- [ ] Database user has least privilege permissions (no DDL)
- [ ] SSL/TLS enabled for all database connections
- [ ] Connection strings stored in secrets manager (not env files)
- [ ] Backup procedures configured and tested (restore verified)
- [ ] Slow query logging enabled (threshold: 1-2s)
- [ ] Monitoring and alerting configured (latency, errors, pool usage)
- [ ] Connection pool sized appropriately (10-20 per instance)
- [ ] Read replicas configured (if read-heavy workload)
- [ ] Audit logging enabled for sensitive operations

## Quick Reference

**Prisma Client Lifecycle:**
1. Create single instance at application startup
2. Call `$connect()` explicitly during initialization
3. Reuse same instance throughout application lifetime
4. Call `$disconnect()` on graceful shutdown (SIGTERM/SIGINT)

**Migration Commands:**
- **Development:** `prisma migrate dev --name descriptive_migration_name`
- **Production:** `prisma migrate deploy` (only!)
- **Reset (dev only):** `prisma migrate reset` (drops DB, reapplies migrations)
- **Generate client:** `prisma generate` (after schema changes)

**Transaction Decision Tree:**
- Single table operation? → **No transaction needed**
- Multiple related writes? → **Sequential transaction** (`$transaction([...])`)
- Conditional logic within transaction? → **Interactive transaction** (`$transaction(async (tx) => {...})`)
- External API calls needed? → **Execute outside transaction** (avoid locks)
- Financial/critical operation? → **Use transaction with retry logic**

**Prisma Query Patterns:**
- **Select specific fields:** Use `select` to limit payload
- **Include relations:** Use `include` for nested data (avoid N+1)
- **Offset pagination:** `take`/`skip` (simple, slower on large datasets)
- **Cursor pagination:** Better performance for large datasets
- **Filtering:** Use indexed `where` clauses
- **Sorting:** Use indexed `orderBy` fields
- **Counting:** Use `count()` for totals
- **Batch operations:** `createMany`, `updateMany`, `deleteMany`

**Error Code Reference:**
- **P2002** → 409 Conflict (unique constraint)
- **P2025** → 404 Not Found (record not found)
- **P2034** → 503 Service Unavailable (deadlock, retry)
- **P2003** → 400 Bad Request (foreign key violation)
- **P2024** → 503 Service Unavailable (connection timeout)

## Essential Dependencies

**Core:** `@prisma/client` (production), `prisma` (dev dependency)

**Optional:** `ioredis` (caching), `pg` (PostgreSQL driver, auto-installed), `mysql2` (MySQL driver, auto-installed)

---

*Database layer is the foundation—design it right with proper separation, security, and observability from day one.*
