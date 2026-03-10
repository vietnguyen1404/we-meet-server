---
description: Implement a feature from an approved implementation plan. Reads the plan file as the primary source, explores the codebase, writes code following existing patterns, and runs lint and tests. Does not perform any Git operations.
agent: agent
tools:
  - execute
  - read
  - search
  - edit
argument-hint: <issue number>
---

# Implement Feature

## Input

The GitHub issue to implement: `${input:issue:Provide the issue number (e.g. 42)}`

---

## Steps

Follow every step in order. Do not skip any step.

### Step 1 — Read the issue

Retrieve the issue for context only:

```bash
gh issue view ${input:issue} --json title,body,labels,assignees,milestone
```

Extract and retain:

- **Title**
- **Functional requirements**
- **Acceptance criteria**
- **Notes / technical hints**

The issue provides **context only**. Implementation tasks must come from the plan file (Step 2), not directly from the issue.

---

### Step 2 — Read the implementation plan (primary source)

The plan file is the **primary source of implementation tasks**. Look for it in the following locations in order:

1. `.github/plans/WM-<issue-number>.md`
2. Any `.md` file inside `.github/plans/`

**If no plan file exists, stop immediately** and instruct the user to run the `plan-feature` prompt first before continuing.

Extract from the plan:

- **Technical design** — affected modules, architecture decisions, API endpoints, database changes
- **Implementation order** — the exact sequence of tasks to follow
- **Task checklist** — every item to implement

Do not implement anything not present in the plan file. The plan is the contract.

---

### Step 3 — Explore the codebase

Before writing any code, read the relevant parts of the codebase. Do not skip this step.

Search for and read:

- Existing modules, services, controllers, and repositories related to the feature
- DTOs and validation patterns in use
- Auth guard and decorator patterns
- Prisma schema (`prisma/schema.prisma`)
- Error handling and response patterns
- Test files for similar features
- Shared utilities and helpers

Use this context to ensure every new file and change is consistent with the existing architecture.

---

### Step 4 — Implement the feature

Implement tasks **strictly following the implementation order from the plan file**. Complete each task from the checklist sequentially before moving to the next.

Rules:

- Follow existing file naming conventions (e.g. `feature.service.ts`, `feature.controller.ts`, `feature.repository.ts`)
- Follow existing module registration patterns in `*.module.ts` files
- Reuse existing shared utilities, guards, decorators, and services — do not reinvent them
- Follow the existing DTO validation style (`class-validator` decorators)
- Follow the existing error handling style (`HttpException` subclasses or NestJS built-ins)
- Do not modify files unrelated to the feature
- Do not remove or alter existing functionality
- Do not implement anything not in the plan

---

### Step 5 — Add or update tests

Add tests as required by the plan.

- Add unit tests for new service methods
- Add integration or e2e tests for new API endpoints if similar tests already exist in the project
- Do not delete existing tests

---

### Step 6 — Run lint and tests

Run the following commands and fix all errors before finishing:

```bash
pnpm lint
pnpm test
```

If lint errors are found, fix them and re-run until the output is clean.

If tests fail, investigate and fix the root cause. Do not suppress or skip failing tests.

Do not proceed to Step 7 until both commands exit without errors.

---

### Step 7 — Finish

When the implementation is complete and lint and tests pass, report the following:

- **Files created** — list every new file added
- **Files modified** — list every existing file changed
- **Implementation summary** — a brief description of what was implemented
- **Follow-up tasks** — any known gaps, deferred decisions, or next steps

**Do NOT perform any Git operations:**

- Do not create a branch
- Do not stage files
- Do not commit
- Do not push
- Do not create a pull request

---

## Constraints

- The **plan file is the primary source of truth** for implementation tasks. Do not implement features based on assumptions or the issue alone.
- Do not implement anything not present in the plan file.
- Do not modify files unrelated to the feature.
- Do not remove, suppress, or skip existing tests.
- Always explore the codebase before writing code.
- Always follow existing architecture patterns found in the repository.
- Always fix lint and test errors before finishing.
- Never create a branch, commit, push, or open a pull request.
