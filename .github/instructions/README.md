# Instructions

> Framework-specific coding standards that automatically guide GitHub Copilot when working on matching files.

## Overview

This directory contains instruction files that define coding standards, best practices, and architectural patterns for specific frameworks and languages. Unlike prompts that you explicitly invoke, instructions **automatically apply** to files matching their `applyTo` pattern.

When you work on a file that matches an instruction's pattern, GitHub Copilot will:
- Follow the defined coding standards
- Generate code using specified patterns
- Enforce best practices automatically
- Suggest implementations that align with your conventions

## How Instructions Work

Instructions use glob patterns in their front matter to determine when to apply:

```yaml
---
description: 'TypeScript coding standards'
applyTo: '**/*.ts,**/*.tsx'
---
```

When you open or edit a matching file, Copilot automatically loads the instruction and uses it as context for all suggestions.

**Installation:**
```bash
# Copy to your project
cp *.instructions.md /path/to/project/.github/instructions/
```

> [!IMPORTANT]
> Restart VS Code after adding or modifying instructions to ensure they load properly.

## Available Instructions

### `angular.instructions.md`

**Comprehensive coding standards for Angular applications with TypeScript**

**Applies to:** `**/*.ts`, `**/*.html`, `**/*.component.ts`, `**/*.service.ts`, `**/*.module.ts`

**Covers:**
- Angular architecture patterns and component design
- Dependency injection and service patterns
- RxJS and reactive programming best practices
- Template syntax and data binding
- Routing and state management
- Testing with Jasmine/Karma

**When to use:** Angular applications requiring enterprise-grade standards and best practices

---

### `nestjs.instructions.md`

**Production-ready standards for NestJS backend applications**

**Applies to:** `**/*.ts`, `**/src/**/*`, `**/*.controller.ts`, `**/*.service.ts`, `**/*.module.ts`

**Covers:**
- NestJS module architecture and dependency injection
- Controller and service patterns
- Database integration with TypeORM/Prisma
- Authentication and authorization
- API documentation with Swagger
- Error handling and validation
- Testing strategies for backend services

**When to use:** NestJS backend applications, REST APIs, and microservices

---

### `nextjs-typescript.instructions.md`

**Modern standards for Next.js applications with TypeScript**

**Applies to:** `**/*.ts`, `**/*.tsx`, `**/pages/**/*`, `**/app/**/*`, `**/components/**/*`

**Covers:**
- Next.js App Router and Pages Router patterns
- Server and Client Components
- Data fetching strategies (SSR, SSG, ISR)
- API routes and server actions
- TypeScript configuration and typing
- Performance optimization

**When to use:** Next.js applications, full-stack React projects, and modern web applications

---

### `nextjs-typescript-admin.instructions.md`

**Production-ready standards for Next.js TypeScript admin applications**

**Applies to:** `**/*.ts`, `**/*.tsx`, `**/pages/**/*`, `**/app/**/*`, `**/components/**/*`, `**/lib/**/*`, `**/utils/**/*`

**Covers:**
- **TypeScript Configuration** - Strict mode, proper typing, generic constraints, utility types
- **Next.js Architecture** - App Router patterns, Server/Client component separation, Server Actions
- **Component Patterns** - Strongly-typed generic components, reusable admin components
- **Data Fetching** - Server Components, React Query/SWR patterns, optimistic updates
- **API Routes** - Zod validation, error handling, proper HTTP status codes
- **Form Handling** - React Hook Form + Zod schemas, controlled components
- **Performance** - Code splitting, image optimization, caching strategies, virtual scrolling
- **State Management** - React Context, React Query for server state, Zustand for client state
- **Security** - Authentication, RBAC, input sanitization, CSRF protection, audit logging
- **Testing** - Unit, integration, and E2E testing patterns with React Testing Library
- **Error Handling** - Error boundaries, structured errors, proper validation
- **Best Practices** - Accessibility, loading states, design systems, keyboard navigation

**When to use:**
- Next.js admin panels or dashboards
- TypeScript-first React applications
- Projects requiring security and strong type safety
- Applications using App Router with Server/Client patterns

---

### `node-express-api.instructions.md`

**HTTP/API layer standards for Node.js + Express applications**

**Applies to:** `src/app.ts`, `src/server.ts`, `**/controllers/**`, `**/routes/**`, `**/middleware/**`

**Covers:**
- **API Architecture** - Layered architecture with controllers, services, repositories
- **Express Patterns** - Route organization, middleware composition, error handling
- **HTTP Concerns** - Status codes, headers, request/response formatting
- **Security** - Authentication, authorization, input validation, rate limiting
- **Validation** - Zod schemas, request validation, type-safe APIs
- **Middleware** - Cross-cutting concerns, logging, authentication
- **Testing** - API testing patterns, mocking, integration tests

**When to use:** Node.js Express APIs, REST services, and HTTP layer implementations

---

### `node-express-database.instructions.md`

**Database and persistence layer patterns for Node.js + Express + Prisma**

**Applies to:** `prisma/**`, `**/repositories/**`, `prisma/schema.prisma`, `prisma/migrations/**`

**Covers:**
- **Prisma Integration** - Schema design, migrations, client configuration
- **Repository Patterns** - Data access layer, DTO mapping, query optimization
- **Database Design** - Schema modeling, relationships, indexing strategies
- **Migrations** - Version control, CI/CD integration, rollback strategies
- **Performance** - Connection pooling, query optimization, caching
- **Security** - Database security, SSL configuration, secrets management
- **Testing** - Database testing, seeding, test isolation

**When to use:** Node.js applications with Prisma ORM, PostgreSQL databases, and data persistence layers

---

### `node-express-service.instructions.md`

**Business logic and service layer patterns for Node.js + Express**

**Applies to:** `**/services/**`, `**/validators/**`, `**/controllers/**`

**Covers:**
- **Service Architecture** - Clean architecture, layer separation, dependency injection
- **Business Logic** - Domain services, orchestration, transaction management
- **Validation** - Zod schemas, runtime validation, error handling
- **Authentication** - JWT handling, password hashing, session management
- **Authorization** - Role-based access, permission systems
- **Error Handling** - Structured errors, logging, monitoring
- **Testing** - Unit testing, mocking, test coverage

**When to use:** Node.js Express applications requiring clean business logic separation

---

### `node-express-prisma-postgres-full.instructions.md`

**Complete full-stack standards for Node.js + Express + Prisma + PostgreSQL**

**Applies to:** `**/*.ts`, `**/*.tsx`, `prisma/**`, `src/**`

**Covers:**
- **Full-Stack Architecture** - Complete layered architecture from HTTP to database
- **Technology Integration** - Node.js, Express, TypeScript, Prisma, PostgreSQL integration
- **Production Readiness** - CI/CD, monitoring, logging, security best practices
- **Performance** - Optimization strategies, caching, connection pooling
- **Security** - Authentication, authorization, input validation, secrets management
- **Testing** - Comprehensive testing strategy across all layers
- **DevOps** - Docker, environment configuration, deployment patterns

**When to use:** Complete Node.js + Express + Prisma + PostgreSQL applications requiring production-grade standards

---

### `prisma.instructions.md`

**Production-ready Prisma ORM standards for TypeScript applications**

**Applies to:** `prisma/**`, `**/*.prisma`, `src/prisma/**`

**Covers:**
- **Schema Design** - Database modeling, relationships, constraints, indexing
- **Migrations** - Migration strategies, version control, rollback procedures
- **Client Configuration** - Connection pooling, query optimization, error handling
- **Type Safety** - Generated types, custom types, validation patterns
- **Performance** - Query optimization, lazy loading, caching strategies
- **Security** - Database security, connection security, input sanitization
- **Testing** - Database testing, seeding, test isolation patterns

**When to use:** Applications using Prisma ORM with PostgreSQL, MySQL, or SQLite databases

---

### `reactjs-typescript.instructions.md`

**Best practices for React applications with TypeScript**

**Applies to:** `**/*.tsx`, `**/*.ts`, `**/components/**/*`, `**/hooks/**/*`, `**/context/**/*`

**Covers:**
- React component patterns and hooks
- TypeScript integration with React
- State management (Context, Redux, Zustand)
- Component composition and reusability
- Performance optimization techniques
- Testing with React Testing Library

**When to use:** React applications with TypeScript, SPAs, and component libraries

---

### `tailwind-styling.instructions.md`

**Styling standards with BEM methodology and Tailwind CSS 4**

**Applies to:** `**/*.css`, `**/*.html`

**Covers:**
- Modified BEM naming convention (hyphen-separated)
- Tailwind CSS 4 integration with `@apply`
- Three-layer styling architecture (Utility, Component, Design Tokens)
- Responsive design patterns
- Accessibility compliance (WCAG 2.1 AA)
- File organization and structure

**When to use:** Projects using Tailwind CSS 4 with BEM methodology for styling

---

### `typescript.instructions.md`

**Core TypeScript coding standards and best practices**

**Applies to:** `**/*.ts`, `**/*.tsx`

**Covers:**
- TypeScript configuration and compiler options
- Type system best practices
- Generic programming patterns
- Utility types and advanced types
- Error handling patterns
- Module system and imports
- Testing TypeScript code

**When to use:** Any TypeScript project requiring strong typing standards

---

### `vuejs-typescript.instructions.md`

**Modern standards for Vue.js 3 applications with TypeScript**

**Applies to:** `**/*.vue`, `**/*.ts`, `**/components/**/*`, `**/composables/**/*`

**Covers:**
- Vue 3 Composition API patterns
- TypeScript integration with Vue
- Component design and props typing
- Composables and reactivity
- Pinia state management
- Testing with Vitest

**When to use:** Vue.js 3 applications with TypeScript and Composition API

## Creating Custom Instructions

### Using the Builder

The easiest way to create instructions is using the builder:

```bash
# Copy the builder to your project
cp ../.builders/build-instruction.prompt.md /path/to/project/.github/

# Run it in Copilot Chat
/build-instruction
```

The builder will analyze your codebase, extract patterns, and generate a custom instruction file with real code examples.

### Manual Creation

Follow this structure when creating instructions manually:

```markdown
---
description: 'Clear description of what this instruction covers'
applyTo: '**/*.{ts,tsx},**/api/**/*'  # Glob patterns (comma-separated)
---

# Instruction Title

## Core Requirements
Fundamental standards that must be followed

## Implementation Patterns
Concrete code examples showing the right way
\`\`\`typescript
// Complete, runnable examples with proper types
\`\`\`

## Best Practices
Quality, performance, and maintainability guidelines

## Anti-Patterns
Common mistakes to avoid with explanations
```

### Glob Pattern Examples

| Pattern | Matches |
|---------|---------|
| `**/*.ts` | All TypeScript files |
| `**/*.{ts,tsx}` | All TypeScript and TSX files |
| `**/src/**/*` | All files under any `src` directory |
| `**/api/**/*.ts` | TypeScript files in any `api` directory |

> **[!TIP]**
> Be specific with patterns to avoid conflicts. More specific patterns take precedence over general ones.

### Best Practices

**Be Concrete:**
```markdown
❌ "Use proper error handling"
✅ "Wrap async operations in try-catch with structured errors:
    try {
      return { data: await operation(), error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }"
```

**Show Real Code:**
- Include complete, runnable examples
- Use proper TypeScript types
- Add comments explaining key decisions
- Demonstrate both correct and incorrect patterns

**Explain the Why:**
- Don't just say what to do, explain why it matters
- Link decisions to performance, security, or maintainability
- Cover edge cases and when to break the rules

**Keep It Focused:**
- One framework or concern per instruction file
- Split large instructions into multiple focused files
- Allow specific instructions to override general ones

## Related Resources

- **[Prompts Directory](../prompts/)** - Task-specific workflows you explicitly invoke
- **[Builders Directory](../.builders/)** - Tools to create custom instructions and prompts
- **[awesome-copilot Instructions](https://github.com/github/awesome-copilot/tree/main/instructions)** - Community instruction examples
- **[VS Code Copilot Customization](https://code.visualstudio.com/docs/copilot/copilot-customization)** - Official documentation

---

**Need a custom instruction?** Use the [build-instruction](../.builders/build-instruction.prompt.md) builder to generate one from your codebase analysis.
