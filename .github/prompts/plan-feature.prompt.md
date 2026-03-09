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

### Step 4 — Feature definition

Derive the following directly from the issue content:

**Feature Summary**
A 2–3 sentence plain-language description of what the feature is and what it does.

**Problem Statement**
Describe the problem or gap this feature addresses. Explain why it matters.

**User Story**

```
As a <user type>, I want <goal> so that <benefit>.
```

_(Reuse the user story from the issue verbatim if present; otherwise derive it.)_

---

### Step 5 — Scope definition

**In Scope**

- What this implementation explicitly covers, based on the issue requirements.

**Out of Scope**

- What is intentionally excluded from this implementation.

---

### Step 6 — Functional requirements

List what the system must do. Derive from the issue's requirements and acceptance criteria. Each item must be independently verifiable.

- [ ] The system must …
- [ ] The system must …
- [ ] The system must …

---

### Step 7 — Technical design

Provide a high-level technical design grounded in the codebase from Step 3. Include only the sections relevant to the feature.

#### Frontend _(if applicable)_

- UI components to create or modify
- User interactions and state transitions
- API calls and data binding

#### Backend

- New or modified NestJS modules, controllers, services
- API endpoints: method, path, request shape, response shape
- Business logic and validation rules
- Auth/permission guards required

#### Database _(if applicable)_

- New Prisma models or changes to existing models
- New fields, relations, indexes, or constraints
- Required migrations

#### Realtime / External services _(if applicable)_

- WebSocket events, queues, or third-party API integrations

---

### Step 8 — Edge cases

List scenarios the implementation must handle gracefully. Derive from the issue notes and acceptance criteria, then add any not covered:

- Permission or role-based access edge cases
- Empty states and missing data
- Network failures or timeout scenarios
- Invalid or unexpected inputs
- Concurrent operations or race conditions

---

### Step 9 — Risks and considerations

Identify potential risks and mitigation strategies:

| Risk   | Impact                | Mitigation            |
| ------ | --------------------- | --------------------- |
| <risk> | <high / medium / low> | <mitigation strategy> |

Consider: performance, scalability, security, data integrity, and technical complexity.

---

### Step 10 — Implementation plan

A sequenced, step-by-step development plan a developer can follow from start to finish:

1. **Setup** — scaffolding, migrations, or configuration changes
2. **Data layer** — Prisma schema changes and generated client
3. **Service layer** — business logic, validation, error handling
4. **API layer** — controllers, DTOs, guards, endpoints
5. **Frontend** — components, API integration, UI states _(if applicable)_
6. **Testing** — unit tests, integration tests, manual test scenarios
7. **Review & deploy** — PR checklist, smoke testing, monitoring

---

### Step 11 — Task breakdown

A developer-ready GitHub checklist. Each task should be small enough to complete in a single focused session.

**Setup**

- [ ] …

**Data layer**

- [ ] …

**Backend**

- [ ] …

**Frontend** _(if applicable)_

- [ ] …

**Testing**

- [ ] …

**Review**

- [ ] Self-review checklist completed
- [ ] All acceptance criteria from the issue verified
- [ ] Unit tests passing
- [ ] Implementation ready for pull request

---

## Constraints

- The **GitHub issue is the single source of truth** for requirements. Do not invent requirements not stated or implied by the issue.
- Do not contradict or reinterpret acceptance criteria from the issue.
- Ground all technical decisions in the existing codebase patterns found in Step 3.
- Omit sections that genuinely do not apply (e.g. no Frontend section for a pure backend feature).
- Ask at most 2 clarification rounds with at most 4 questions each.
- Do not generate implementation code — produce a plan only.
- Do not create or suggest creating a pull request.
- The output must stop at an implementation plan and task checklist only.
- No repository mutations (PR creation, commits, pushes) are allowed.
- The plan must be specific enough that a developer can start implementation immediately without further clarification.
