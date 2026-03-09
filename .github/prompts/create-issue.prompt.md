---
description: Convert a rough feature idea into a structured GitHub issue and create it using the gh CLI.
agent: agent
tools:
  - execute
  - web/githubRepo
argument-hint: <rough feature idea>
---

# Create GitHub Issue

## Input

The user's rough feature idea is provided via: `${input:featureIdea:Describe the feature idea}`

---

## Steps

Follow these steps in order. Do not skip any step.

### Step 1 — Parse the requirement

Analyze the input and extract the following from the feature idea:

- **Feature intent** — what the feature does
- **Target user** — who will use it
- **Expected outcome** — what value it delivers
- **Possible scope** — what is in and out of scope

---

### Step 2 — Clarify the requirement (if needed)

If any of the four attributes above are unclear or missing, ask clarifying questions before proceeding.

Ask **at most 4 questions per round**. Use at most **2 rounds**.

**Round 1** — ask only if unclear:

1. Who is the target user of this feature?
2. What is the primary goal they want to achieve?
3. What is the scope — what is included and what is not?
4. What is the priority of this feature (low / medium / high)?

**Round 2** (only if still unclear after Round 1) — ask only if unclear:

1. Are there any UI/UX expectations or design references?
2. Are there any known edge cases or error scenarios to handle?
3. Does this feature depend on other features or services?
4. Are there any technical constraints (performance, security, compatibility)?

Stop asking once the requirement is clear enough to produce a complete issue.

---

### Step 3 — Determine the next WM issue number

Find the highest WM issue number from existing issue titles.

Run:

```bash
gh issue list --limit 200 --json title \
  --jq '[.[].title | capture("WM-(?<n>[0-9]+)")?.n | tonumber] | max // 0'
```

Increment the result by 1. Use this value as the prefix:

```
WM-<number>: <issue title>
```

Rules:

- Only consider titles matching `WM-<number>` — ignore pull request numbers entirely.
- If no WM issues exist, start from `WM-1`.

---

### Step 4 — Draft the issue

Generate the issue title and body using the structure below.

**Title:**

```
WM-<number>: <concise imperative title under 70 characters>
```

**Body:**

```markdown
## Background & Purpose

<Explain the problem or opportunity this feature addresses. 1–3 sentences.>

## User Story

As a **<user type>**, I want **<goal>** so that **<benefit>**.

## Functional Requirements

- [ ] <requirement 1>
- [ ] <requirement 2>
- [ ] <requirement 3>

## Acceptance Criteria

- [ ] <criterion 1>
- [ ] <criterion 2>
- [ ] <criterion 3>

## Notes

<Any additional context, constraints, dependencies, or open questions.>
```

---

### Step 5 — Preview the draft

Display the **full issue draft** (title + body) to the user as plain Markdown — do NOT embed it inside a question UI.

Then ask the user:

> Does this issue look good to create?
>
> - **Approve** — create the issue as shown
> - **Edit** — describe what to change, then return to Step 4
> - **Cancel** — stop without creating anything

---

### Step 6 — Create the issue

If the user approves, run:

```bash
gh issue create --title "WM-<number>: <title>" --body "$(cat <<'EOF'
<issue body>
EOF
)"
```

---

### Step 7 — Return the result

Output the GitHub issue URL returned by `gh issue create`.

---

## Constraints

- Do not create the issue without explicit user approval in Step 5.
- Do not invent requirements not mentioned or implied by the user.
- The issue title must be under 70 characters (excluding the `WM-<number>:` prefix).
- Use the `WM-<number>` prefix derived from the live issue list — never hardcode it.
- Acceptance criteria must be independently verifiable.
- Ask at most 2 clarification rounds with at most 4 questions each.
