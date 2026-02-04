# Setup Guide

This document describes the minimal, production-ready NestJS foundation that has been configured.

## What's Included

### Core Setup

✅ **NestJS + TypeScript (Strict Mode)**

- Strict TypeScript compilation enabled
- ESM module system configured
- NestJS 11.x with all core packages

✅ **Environment Configuration**

- Global ConfigModule with Zod validation
- Type-safe environment variables
- `.env.example` provided

✅ **Database Layer**

- Prisma ORM with PostgreSQL
- Global PrismaModule with lifecycle hooks
- Connection management with proper cleanup
- Health check queries

✅ **Global Middleware**

- ValidationPipe (class-validator + class-transformer)
- GlobalExceptionFilter with structured error responses
- CORS enabled

✅ **Health Endpoint**

- `GET /health` - Application and database health
- Returns status, uptime, and database connectivity

✅ **Code Quality**

- ESLint with TypeScript rules
- Prettier formatting
- Husky pre-commit hooks
- lint-staged for staged files only

✅ **Development Tools**

- Docker Compose for local PostgreSQL
- Database scripts (migrate, generate, studio)
- Watch mode for development

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Variables

```bash
cp .env.example .env
```

Required variables:

- `NODE_ENV` - development/production/test
- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string

### 3. Start Database

```bash
docker-compose up -d
```

This starts PostgreSQL on `localhost:5432` with:

- Database: `wemeet`
- User: `postgres`
- Password: `postgres`

### 4. Run Migrations

```bash
pnpm db:generate  # Generate Prisma Client
pnpm db:migrate   # Run migrations
```

### 5. Start Server

```bash
pnpm start:dev
```

Access:

- API: `http://localhost:3000`
- Health: `http://localhost:3000/health`

## Project Structure

```
src/
├── common/
│   └── filters/
│       └── global-exception.filter.ts    # Global error handling
├── config/
│   ├── env.validation.ts                 # Zod schema for env vars
│   └── index.ts
├── database/
│   ├── prisma.module.ts                  # Global Prisma module
│   └── prisma.service.ts                 # Prisma with lifecycle hooks
├── health/
│   ├── health.controller.ts              # Health endpoint
│   ├── health.service.ts                 # Health checks
│   └── health.modules.ts
├── app.module.ts                          # Root module
└── main.ts                                # Bootstrap with global config
```

## Key Features

### Environment Validation

Environment variables are validated on startup using Zod:

```typescript
// src/config/env.validation.ts
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().positive().default(3000),
  DATABASE_URL: z.string().url(),
});
```

### Global Validation

All incoming requests are validated:

```typescript
// Configured in main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Strip unknown properties
    forbidNonWhitelisted: true, // Throw on unknown properties
    transform: true, // Transform to DTO instances
  }),
);
```

### Exception Handling

All errors return a consistent format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [...],
  "timestamp": "2026-02-04T12:00:00.000Z",
  "path": "/api/endpoint"
}
```

### Health Check

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-02-04T12:00:00.000Z",
  "uptime": 123.456,
  "checks": {
    "database": {
      "status": "up",
      "responseTime": "5ms"
    }
  }
}
```

## Available Scripts

### Development

```bash
pnpm start:dev      # Watch mode
pnpm start:debug    # Debug mode
pnpm build          # Production build
pnpm start:prod     # Run production
```

### Database

```bash
pnpm db:generate          # Generate Prisma Client
pnpm db:push              # Push schema (dev only)
pnpm db:migrate           # Create migration
pnpm db:migrate:deploy    # Deploy migrations
pnpm db:studio            # Open Prisma Studio
```

### Code Quality

```bash
pnpm lint           # Lint and fix
pnpm format         # Format code
pnpm format:check   # Check formatting
```

### Testing

```bash
pnpm test           # Unit tests
pnpm test:watch     # Watch mode
pnpm test:cov       # Coverage
pnpm test:e2e       # E2E tests
```

## Next Steps for Feature Development

### 1. Create a Feature Module

```bash
# Using NestJS CLI
nest g module features/users
nest g service features/users
nest g controller features/users
```

### 2. Add DTOs

```typescript
// src/features/users/dto/create-user.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

### 3. Add Prisma Models

```prisma
// prisma/schema.prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Then run:

```bash
pnpm db:migrate
```

### 4. Implement Business Logic

The foundation handles:

- ✅ Request validation
- ✅ Error handling
- ✅ Database connections
- ✅ Environment config
- ✅ Code quality

You focus on:

- Business logic in services
- API endpoints in controllers
- Database queries via Prisma

## Configuration Details

### TypeScript (strict mode)

```json
{
  "strict": true,
  "strictNullChecks": true,
  "noImplicitAny": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true
}
```

### ESLint

Configured with:

- `@typescript-eslint` recommended rules
- Prettier integration
- Custom rules for unused vars and console logs

### Prettier

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

### Git Hooks (Husky)

Pre-commit:

- Runs `lint-staged` on staged files
- Lints TypeScript files
- Formats all staged files

## What's NOT Included

This is a minimal foundation. The following are intentionally excluded:

❌ Authentication/Authorization  
❌ Business logic or domain models  
❌ API routes beyond /health  
❌ Repositories or data access patterns  
❌ WebSockets  
❌ Redis/caching  
❌ File uploads  
❌ Email/notifications  
❌ Rate limiting  
❌ API documentation (Swagger)

Add these as needed for your features.

## Troubleshooting

### Database Connection Failed

Check:

1. Docker container is running: `docker ps`
2. DATABASE_URL in `.env` matches Docker config
3. PostgreSQL is accessible: `docker-compose logs postgres`

### Prisma Client Not Found

Run:

```bash
pnpm db:generate
```

### ESLint/Prettier Conflicts

Run:

```bash
pnpm format
pnpm lint
```

### Port Already in Use

Change PORT in `.env` or stop conflicting process:

```bash
lsof -ti:3000 | xargs kill -9
```

## Production Checklist

Before deploying:

- [ ] Set `NODE_ENV=production`
- [ ] Use strong secrets for JWT/sessions
- [ ] Configure production DATABASE_URL
- [ ] Run `pnpm db:migrate:deploy`
- [ ] Build: `pnpm build`
- [ ] Test health endpoint
- [ ] Configure logging/monitoring
- [ ] Set up CI/CD
- [ ] Configure reverse proxy (nginx)
- [ ] Enable HTTPS
- [ ] Set up backup strategy

## Support

For questions about this setup, refer to:

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
