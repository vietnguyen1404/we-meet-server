---
description: 'Production-ready Prisma ORM instructions for TypeScript applications'
applyTo: 'prisma/**, **/*.prisma, src/prisma/**'
---

# Prisma ORM

Production-ready guide for using Prisma ORM with PostgreSQL/MySQL databases in TypeScript applications.

## Prerequisites

### Required Knowledge
- TypeScript fundamentals and type system
- SQL and relational database concepts
- Database modeling and relationships
- Migration concepts and versioning

### Required Tools
- Node.js 18+ (LTS)
- Database server (PostgreSQL 12+, MySQL 8+, SQLite)
- TypeScript compiler

## Core Requirements

### Success Criteria
- All migrations run successfully without data loss
- Type-safe database queries with proper error handling
- Connection pooling configured for production load
- Database schema versioned and tracked in migrations
- Query performance optimized with proper indexing

### Critical Edge Cases
- Handle connection failures gracefully with retries
- Manage concurrent migrations in team environments
- Deal with schema changes that require data transformation
- Handle connection pool exhaustion under load
- Manage database constraints and cascading deletes safely

## Architecture

### Project Structure
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

### Separation of Concerns
- **Schema:** Define models, relations, and constraints in `schema.prisma`
- **Migrations:** Version control schema changes automatically
- **Client:** Single shared instance for connection management
- **Repositories:** Encapsulate data access patterns and business logic
- **Types:** Leverage generated TypeScript types for type safety

## Essential Dependencies

### Core
- `@prisma/client` - Generated database client
- `prisma` - CLI and development tools

### Optional Enhancements
- `prisma-json-types-generator` - Better JSON field typing
- `prisma-dbml-generator` - Database documentation
- `prisma-docs-generator` - API documentation

## Prisma Schema Configuration

### Generator Configuration
- Set `provider = "prisma-client-js"` for TypeScript client generation
- Optional custom output path for generated client
- Add generators for documentation (DBML, docs) when needed

### Database Configuration
- Use `postgresql`, `mysql`, or `sqlite` provider
- Configure `DATABASE_URL` environment variable
- Optional `SHADOW_DATABASE_URL` for migration generation
- Use `DIRECT_URL` for connection pooling services like PgBouncer

### Environment Variables
- `DATABASE_URL` - Primary connection string with credentials
- `SHADOW_DATABASE_URL` - For migration generation (optional)
- `DIRECT_URL` - For connection pooling services like PgBouncer

## Model Definition Best Practices

### Primary Keys
- Use `@id @default(autoincrement())` for integer IDs
- Use `@id @default(uuid())` for UUID primary keys
- Consider cuid() for distributed systems

### Timestamps
- Always include `createdAt DateTime @default(now())`
- Always include `updatedAt DateTime @updatedAt`
- Use consistent naming across all models

### Unique Constraints
- Apply `@unique` to fields requiring uniqueness (email, username)
- Use `@@unique([field1, field2])` for composite unique constraints
- Consider database performance implications

### Enums
- Define enums for fixed value sets (roles, statuses, types)
- Use descriptive, consistent naming conventions
- Set appropriate defaults with `@default(VALUE)`

### Relationships

#### One-to-Many
- Define array field on parent model (posts Post[])
- Include foreign key and relation on child model
- Set appropriate onDelete behavior (Cascade, Restrict, SetNull)

#### Many-to-Many
- Create explicit junction table for full control
- Use composite primary key `@@id([field1, field2])`
- Include additional fields if needed (timestamps, metadata)

#### Self-Relations
- Use named relations to avoid conflicts
- Handle nullable foreign keys for optional relationships
- Consider tree structures and recursive queries

### Cascade Behaviors
- `Cascade` - Delete related records (use carefully)
- `Restrict` - Prevent deletion if related records exist
- `NoAction` - Database default behavior
- `SetNull` - Set foreign key to null (requires nullable field)

### Indexing Strategy
- Index frequently queried columns
- Create composite indexes for multi-column queries
- Index foreign keys for join performance
- Consider query patterns when designing indexes
- Monitor query performance and add indexes as needed

### JSON Fields
- Use for flexible, schema-less data storage
- Consider typed JSON generators for better TypeScript support
- Provide sensible defaults for JSON fields
- Be cautious with querying JSON fields (performance implications)

## Prisma Client Configuration

### Shared Client Instance
- Create single PrismaClient instance using singleton pattern
- Use globalThis to prevent multiple instances in development
- Configure appropriate logging based on environment
- Export from dedicated client module for reuse

### Connection Configuration
- Enable query logging in development for debugging
- Use colorless error format for better log parsing
- Configure datasource URLs dynamically via environment
- Set appropriate log levels (query, info, warn, error)

### Connection Resilience
- Implement retry logic with exponential backoff (max 5 retries)
- Handle connection failures gracefully with proper error logging
- Set maximum retry delays to prevent infinite waits (30s max)
- Exit process if connection cannot be established after retries
- Reset retry counter on successful connections

### Graceful Shutdown
- Listen for SIGTERM and SIGINT signals
- Disconnect Prisma client before process termination
- Log shutdown steps for debugging
- Ensure clean process exit with appropriate exit codes

## Query Patterns

### CRUD Operations

#### Create Operations
- Use `create()` for single record creation with validation
- Use `createMany()` for bulk operations with `skipDuplicates` option
- Create with nested relations using nested write syntax
- Include related data in response when needed

#### Read Operations
- Use `findUnique()` for single records by unique field
- Use `findMany()` with filtering, sorting, and pagination
- Leverage `include` for relations or `select` for specific fields
- Implement complex filtering with `OR`, `AND`, and nested conditions
- Use comparison operators: `gte`, `lte`, `gt`, `lt`, `contains`, `startsWith`, `endsWith`

#### Update Operations
- Use `update()` for single record updates with where clause
- Use `updateMany()` for batch updates with filtering
- Support nested updates for related data
- Use atomic operations for numeric fields (`increment`, `decrement`)

#### Delete Operations
- Use `delete()` for single record deletion
- Use `deleteMany()` for batch deletions with filtering
- Consider cascade behaviors for related data
- Implement soft deletes when appropriate

### Advanced Querying

#### Field Selection
- Use `select` to fetch only needed fields for performance
- Apply field selection to nested relations
- Balance between over-fetching and multiple queries

#### Aggregations
- Use `aggregate()` for count, sum, avg, min, max operations
- Use `groupBy()` for grouped aggregations with having clauses
- Consider performance implications of complex aggregations
- Use database views for frequently used aggregations

## Pagination Patterns

### Cursor-Based Pagination (Recommended)
- Fetch `limit + 1` items to determine if there's a next page
- Use cursor field (typically ID) for consistent ordering
- Skip cursor item when provided to avoid duplication
- Return items, nextCursor, and hasNextPage metadata
- Best for real-time data and large datasets
- Stable performance regardless of offset size

### Offset-Based Pagination
- Calculate skip value from page number and page size
- Run count query in parallel with data query for total
- Return comprehensive metadata (page, pageSize, total, totalPages)
- Suitable for small to medium datasets
- Required when users need to jump to specific pages
- Performance degrades with large offsets

## Transaction Handling

### Sequential Transactions
- Use `$transaction([])` array for simple batch operations
- All operations execute in order within single transaction
- If any operation fails, entire transaction rolls back
- Good for independent operations that must all succeed together

### Interactive Transactions
- Use `$transaction(async (tx) => {})` callback for complex logic
- Access full Prisma client within transaction context
- Support conditional operations and business logic
- Configure timeout and isolation level as needed
- Handle errors appropriately within transaction scope

### Transaction Best Practices
- Keep transactions short and focused to minimize lock duration
- Never make external API calls within transactions
- Implement retry logic for deadlock scenarios (P2034 errors)
- Set appropriate timeouts (5-15 seconds recommended)
- Use optimistic locking for concurrent update scenarios
- Log transaction failures with context for debugging

### Optimistic Locking
- Add version field to models requiring concurrent update protection
- Increment version on each update operation
- Include current version in WHERE clause when updating
- Handle version mismatch errors (P2025) with retry logic
- Best for inventory, account balances, and booking systems

## Migration Management

### Development Workflow
- Use `prisma migrate dev --name descriptive_name` to create and apply migrations
- Run `prisma generate` after schema changes to update client
- Use `prisma migrate reset` to reset database in development only
- Check migration status with `prisma migrate status`

### Production Deployment
- ALWAYS use `prisma migrate deploy` in production (never migrate dev)
- Run migrations before deploying application code
- Generate client after schema changes in CI/CD pipeline
- Test migrations on staging environment first

### Migration Best Practices

#### Naming Conventions
- Use descriptive names with action and entity: `add_user_roles`, `remove_deprecated_fields`
- Include purpose in name for clarity
- Use snake_case for consistency across team

#### Safe Migrations
- Prefer backward-compatible changes when possible
- Split breaking changes into multiple migrations
- Test migrations on production-like data volumes
- Plan and document rollback strategies for breaking changes

#### Data Transformations
- Add new columns first, migrate data, then remove old columns
- Use separate migrations for schema and data changes
- Test data transformations thoroughly before production
- Consider downtime requirements for large data migrations
- Use temporary columns during complex transformations

## Error Handling

### Prisma Error Mapping
- Create custom DatabaseError class with message, code, and statusCode
- Map P2002 (unique constraint) to 409 Conflict
- Map P2025 (record not found) to 404 Not Found  
- Map P2003 (foreign key violation) to 400 Bad Request
- Map P2034 (transaction conflict) to 409 Conflict for retry
- Handle PrismaClientValidationError as 400 Bad Request
- Handle PrismaClientInitializationError as 503 Service Unavailable
- Log all database errors with full context for debugging

### Repository Pattern with Error Handling
- Wrap all Prisma operations in try-catch blocks
- Use centralized error mapping function
- Never expose raw Prisma errors to application layer
- Provide meaningful error messages for each error type
- Include relevant metadata from Prisma errors when safe
- Implement consistent error handling across all repositories

## Performance Optimization

### Query Optimization

#### Field Selection
- Always use `select` to fetch only required fields
- Apply field selection to nested relations to reduce data transfer
- Balance between over-fetching and making multiple queries
- Monitor query response sizes in production

#### Avoid N+1 Queries
- Use `include` or `select` with relations instead of loops
- Fetch related data in single query when possible
- Consider using `findMany` with proper filtering over multiple `findUnique` calls
- Use eager loading for predictable relation access patterns

#### Database Indexing
- Index all frequently queried columns (foreign keys, search fields)
- Create composite indexes for multi-column query patterns
- Index columns used in WHERE, ORDER BY, and JOIN clauses
- Monitor slow query logs to identify missing indexes
- Consider partial indexes for filtered queries

#### Connection Pool Configuration
- Configure `connection_limit` parameter in DATABASE_URL (typically 10-20)
- Set appropriate `pool_timeout` (10-20 seconds)
- Monitor connection pool usage in production
- Scale connection limits based on application load

### Query Analysis
- Enable query logging with event emitters for detailed analysis
- Log query duration and parameters in development
- Monitor slow queries (>100ms) in production
- Use database-specific query analysis tools (EXPLAIN, pg_stat_statements)
- Set up alerting for query performance degradation

## Database Seeding

### Seed Script Setup
- Create `prisma/seed.ts` with main seeding function
- Use `upsert` operations to handle existing data gracefully
- Create admin users, sample data, and test fixtures
- Use `createMany` for bulk data insertion with `skipDuplicates`
- Log seeding progress and results for debugging
- Handle errors appropriately and disconnect client in finally block

### Package.json Configuration
- Add prisma seed configuration pointing to seed script
- Create npm script for easy seed execution
- Use ts-node or tsx for TypeScript seed scripts
- Consider separate seed scripts for different environments

## Testing with Prisma

### Test Database Setup
- Use separate test database with `DATABASE_URL_TEST` environment variable
- Push schema to test database using `prisma db push` in test setup
- Connect to database in beforeAll, disconnect in afterAll
- Clean up data between tests using TRUNCATE or DELETE operations
- Skip migration tables during cleanup to preserve schema

### Unit Testing
- Create dedicated test setup file with database utilities
- Use beforeEach to seed required test data
- Test service layer methods with realistic data scenarios
- Mock external dependencies but use real database for integration tests
- Assert both positive and negative test cases
- Clean up test data to ensure test isolation

## Raw SQL Queries

### When to Use Raw SQL
- Complex aggregations not supported by Prisma query API
- Performance-critical queries requiring specific optimizations
- Database-specific features (window functions, CTEs, stored procedures)
- Data migration transformations during schema changes
- Reporting queries with complex business logic

### Safe Raw Queries
- ALWAYS use `$queryRaw` with tagged template literals for parameterization
- Use `Prisma.sql` helper for complex multi-line queries
- NEVER use `$queryRawUnsafe` with user input (SQL injection risk)
- Type the return value with proper TypeScript interfaces
- Validate and sanitize all input parameters before use

### Execute Raw SQL
- Use `$executeRaw` for non-SELECT operations (INSERT, UPDATE, DELETE)
- Use parameterized queries to prevent SQL injection
- Handle database-specific errors appropriately
- Consider transaction context when executing multiple raw operations
- Log raw SQL operations for debugging and monitoring

## Anti-Patterns to Avoid

**❌ Multiple Prisma Client Instances**
- DON'T create new PrismaClient() in multiple files
- ✅ DO: Use singleton pattern with shared global instance

**❌ N+1 Query Problem**
- DON'T fetch relations in loops causing multiple database round trips
- ✅ DO: Use `include` or `select` with relations for eager loading

**❌ Ignoring Transaction Isolation**
- DON'T perform read-then-write operations without proper isolation
- ✅ DO: Use atomic updates or proper transactions for consistency

**❌ Exposing Raw Prisma Errors**
- DON'T return raw Prisma errors to clients (exposes internal details)
- ✅ DO: Map Prisma errors to user-friendly application errors

**❌ Using migrate dev in Production**
- DON'T use development migration commands in production environments
- ✅ DO: Use `migrate deploy` for production deployments

**❌ Fetching Unnecessary Data**
- DON'T fetch all fields when only specific fields are needed
- ✅ DO: Use `select` to limit fields and reduce data transfer

**❌ Ignoring Connection Pool Limits**
- DON'T exceed database connection limits with multiple clients
- ✅ DO: Configure appropriate connection pooling and limits

**❌ Missing Error Handling**
- DON'T ignore database errors or let them bubble up uncaught
- ✅ DO: Implement comprehensive error handling and retry logic

## Troubleshooting Guide

### Common Issues

#### Connection Problems
- **Symptom:** "Can't reach database server" or connection timeouts
- **Solutions:** Verify DATABASE_URL format, check network connectivity, ensure database server is running, verify connection pool limits and firewall rules

#### Migration Conflicts
- **Symptom:** Migration fails with "already exists" or conflict errors
- **Solutions:** Reset migration state with `prisma migrate reset` (dev only), manually resolve conflicts in migration files, use `prisma db push` for development prototyping

#### Type Generation Issues
- **Symptom:** TypeScript errors after schema changes or outdated types
- **Solutions:** Run `prisma generate`, restart TypeScript language server, clear `node_modules/.prisma` cache, check for schema validation errors

#### Performance Issues
- **Symptom:** Slow query responses or high database load
- **Solutions:** Enable query logging to identify bottlenecks, add database indexes for frequently queried columns, use field selection to limit data transfer, optimize N+1 queries with eager loading

#### Transaction Deadlocks
- **Symptom:** P2034 error code during concurrent operations
- **Solutions:** Implement retry logic with exponential backoff, reduce transaction scope and duration, use consistent resource access ordering, consider optimistic locking for high-concurrency scenarios

### Debugging Tips

#### Query Performance Analysis
- Enable detailed query logging with duration tracking
- Use custom event handlers to log query parameters and execution time
- Monitor slow queries (>100ms) and add appropriate indexes
- Use database-specific tools (EXPLAIN, pg_stat_statements) for analysis
- Set up alerting for query performance degradation

## Quick Reference

### Essential Commands
```bash
# Schema and client
npx prisma generate              # Generate Prisma Client
npx prisma db push              # Push schema to database (dev)
npx prisma db pull              # Pull schema from database

# Migrations
npx prisma migrate dev          # Create and apply migration (dev)
npx prisma migrate deploy       # Apply migrations (production)
npx prisma migrate status       # Check migration status
npx prisma migrate reset        # Reset database (dev only)

# Database utilities
npx prisma db seed              # Run seed script
npx prisma studio              # Open database GUI
npx prisma validate            # Validate schema

# Introspection and debugging
npx prisma debug               # Debug connection issues
npx prisma format              # Format schema file
```

### Environment Variables
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/database?schema=public"
SHADOW_DATABASE_URL="postgresql://username:password@localhost:5432/shadow"
DATABASE_URL_TEST="postgresql://username:password@localhost:5432/test_db"
```

## Key Principles

1. **Type Safety:** Leverage generated TypeScript types for compile-time safety
2. **Single Source of Truth:** Schema defines both database and TypeScript types
3. **Migration Discipline:** Version control all schema changes through migrations
4. **Performance First:** Use proper indexing and query optimization
5. **Connection Management:** Single client instance with proper connection pooling
6. **Error Handling:** Map Prisma errors to application-specific errors
7. **Transaction Safety:** Use transactions for multi-operation consistency
8. **Testing:** Use separate test database with proper cleanup
9. **Security:** Use parameterized queries, never raw string interpolation
10. **Monitoring:** Log queries and monitor performance in production
