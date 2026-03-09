---
description: Generate a developer-ready technical implementation plan from an existing GitHub issue.
agent: agent
tools:
  - execute
  - web/githubRepo
  - read
  - search
argument-hint: <issue number, issue URL, or paste issue content>
---

# Plan Feature from GitHub Issue

## Input

The GitHub issue to plan: `${input:issue:Provide an issue number (e.g. 42), a URL, or paste the issue content}`

---

## Steps

Follow every step in order. Do not skip any step.

### Step 1 — Read the issue

The GitHub issue is the **primary source of requirements**. Retrieve its full content.

- If the input is an **issue number** (e.g. `42`), run:
  ```bash
  gh issue view 42 --json title,body,labels,assignees,milestone
  ```
- If the input is an **issue URL**, extract the number from the URL and run the same command.
- If the input is **pasted issue content**, use it directly.

Extract the following from the issue:

- **Title**
- **Description / background**
- **User story** (if present)
- **Functional requirements** (if present)
- **Acceptance criteria** (if present)
- **Notes / technical hints** (if present)

---

### Step 2 — Clarify technical gaps (if needed)

If the issue lacks information needed to produce a complete technical plan, ask clarifying questions before continuing.

Ask **at most 4 questions per round**. Use at most **2 rounds**. Stop once enough context exists.

**Round 1** — ask only what is missing:

1. Are there technical constraints such as performance requirements, security rules, or platform limitations?
2. Where does responsibility sit — is this backend-only, frontend-only, or full-stack?
3. Does this feature depend on other features, services, or third-party integrations?
4. Are there known edge cases or error scenarios the issue does not mention?

**Round 2** (only if still unclear after Round 1):

1. Are there UI/UX specifications or a design reference to follow?
2. What access-control or permission rules apply to this feature?
3. Are there data migration or backward-compatibility concerns?
4. Is there a target timeline or scope constraint that limits what can be built?

---

### Step 3 — Explore the codebase

Search the existing codebase to understand the relevant architecture before designing. Look for:

- Existing modules, services, or controllers related to the issue
- Database models or schemas that may need to be extended
- Auth/permission patterns already in use
- API conventions (routing, DTOs, response format, error handling)

Use this context to ground every technical decision in Steps 5–9.

---

### Step 4 — Produce the plan

Using the issue content and codebase findings, generate an implementation plan with **exactly** the following sections in this order. Do not add or remove sections.

---

### 1. Feature Summary

Explain briefly what the feature does (2–3 sentences).

---

### 2. Problem Statement

Explain the problem the feature solves and why it matters.

---

### 3. Technical Design

Describe the architecture and implementation approach grounded in the existing codebase patterns found in Step 3.

Include:

- **Affected modules** — NestJS modules, files, or packages that must change
- **Services to modify or create** — service classes and their responsibilities
- **Database changes** — Prisma model changes, new fields, relations, indexes, migrations
- **API endpoints** — method, path, request shape, response shape
- **Validation rules** — DTO validation, guard logic, permission checks

Omit sub-sections that genuinely do not apply to this feature.

---

### 4. Edge Cases

List potential edge cases the implementation must handle gracefully:

- Invalid or unexpected input
- Missing or null data
- Permission and role-based access issues
- Concurrency or race conditions
- Any additional edge cases derived from the issue or codebase context

---

### 5. Implementation Plan

Provide a high-level, sequenced technical implementation plan a developer can follow from start to finish. Each step should describe **what** to do, not show code.

---

### 6. Implementation Order

List the **exact order** developers should implement the steps. Use a numbered list.

Example:

1. Update Prisma schema
2. Run and apply migration
3. Implement service logic
4. Create DTO
5. Add controller endpoint
6. Add guard or permission check
7. Write tests

---

### 7. Task Breakdown

A GitHub-style checklist where each task is small enough to implement in one focused session.

- [ ] task 1
- [ ] task 2
- [ ] task 3

---

### Step 5 — Save the plan

Write the generated plan to the repository so it can be referenced by the `implement-feature` prompt.

1. Determine the **issue identifier** extracted in Step 1.
   - If the issue title or identifier contains a ticket ID (for example `WM-1`, `WM-2`, etc.), use that ID.
   - Otherwise fall back to the GitHub issue number.

2. Ensure the `.github/plans` directory exists:

```bash
mkdir -p .github/plans
```

3. Generate the filename using the issue identifier:

```
.github/plans/WM-<issue-id>.md
```

Examples:

```
.github/plans/WM-1.md
.github/plans/WM-2.md
```

4. Write the complete plan (all seven sections from Step 4, in order) to that file.

Overwrite the file if it already exists.

5. Confirm the file was written by printing its path.

---

## Constraints

- The **GitHub issue is the single source of truth** for requirements. Do not invent requirements not stated or implied by the issue.
- Do not contradict or reinterpret acceptance criteria from the issue.
- Ground all technical decisions in the existing codebase patterns found in Step 3.
- Follow existing architecture patterns in the repository.
- Ask at most 2 clarification rounds with at most 4 questions each.
- Do not write implementation code — produce a technical plan only.
- The output must use **exactly** the seven sections defined in Step 4, in order.
- Do not create or suggest creating a pull request.
- The only permitted repository mutation is writing the plan file to `.github/plans/WM-<number>.md`. No other mutations (PR creation, commits, pushes) are allowed.
- The plan must be specific enough that a developer can start implementation immediately without further clarification.
