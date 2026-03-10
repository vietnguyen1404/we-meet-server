---
description: Create a GitHub pull request from the current branch targeting develop. Analyzes the diff, detects PR type, generates a proper branch name, renames or creates the branch as needed, pushes it, then creates the PR using the gh CLI.
agent: agent
tools:
  - execute
  - web/githubRepo
---

# Create Pull Request

## Instructions

Follow these steps in order. Do not skip any step.

### 1. Collect repository context

Run the following commands and save all output for subsequent steps:

```bash
git branch --show-current
git log develop..HEAD --oneline
git diff develop...HEAD
```

Save:

- current branch name
- commit messages
- full diff of changes relative to `develop`

### 2. Analyze the diff

Read the diff and determine:

- what functionality or change was implemented
- which modules or folders were affected
- the purpose of the change

This analysis will be used to generate the branch name, PR type, PR title, and PR description.

### 3. Detect PR type

Infer the PR type from the diff using Conventional Commit categories:

| Type       | When to use                                         |
| ---------- | --------------------------------------------------- |
| `feat`     | New feature or capability                           |
| `fix`      | Bug fix                                             |
| `refactor` | Internal code restructuring without behavior change |
| `chore`    | Maintenance or tooling changes                      |
| `docs`     | Documentation-only changes                          |
| `test`     | Test additions or updates                           |
| `perf`     | Performance improvement                             |

Also derive the **scope**: the primary module or area affected (e.g., `auth`, `meeting`, `user`, `prisma`).

This detected type and scope will be used in the branch name and PR title.

### 4. Generate branch name

Generate a branch name derived from the detected change.

Format: `type/scope-short-description`

Examples:

- `feat/auth-jwt-strategy`
- `fix/meeting-lobby-redirect`
- `refactor/meeting-service-validation`

Rules:

- Lowercase only, words separated by hyphens
- Concise and derived from the diff

**If the current branch is `develop` or `main`**, create a new branch:

```bash
git checkout -b <generated-branch-name>
```

**If the current branch does not follow the `type/scope-description` convention**, rename it:

```bash
git branch -m <generated-branch-name>
```

**If the current branch already follows the convention**, continue to the next step.

### 5. Create commit

Stage all changes and create a commit before pushing.

```bash
git add .
```

Generate a **single-line commit message** describing the change.

Rules:

- One short sentence only
- Imperative mood
- No bullet points
- No long explanations
- No file names
- Prefer under 60 characters

Format:

`type(scope): short description`

Examples:

- `perf(signaling): optimize socket lookup`
- `fix(meeting): handle participant reconnection`
- `refactor(auth): simplify token validation`

Create the commit:

```bash
git commit -m "<generated-commit-message>"
```

### 6. Extract GitHub issue reference

Attempt to extract an issue reference from:

- branch name
- commit messages

Expected format: `WM-###`

Rules:

- If an issue reference is found, include it in the PR body under `## References`.
- If none is found, continue without adding a reference. **Do not ask the user and do not invent one.**

### 7. Push the branch

Ensure the branch exists on the remote repository:

```bash
git push -u origin HEAD
```

### 8. Generate PR title

Generate the title using Conventional Commit format:

`type(scope): short description`

Examples:

- `feat(auth): add JWT authentication strategy`
- `fix(meeting): resolve lobby redirect bug`

Rules:

- Under 70 characters
- Imperative mood
- Derived from the diff

### 9. Generate PR description

Generate a PR body with the following structure.

**With issue reference:**

```
## References
- #<issue-number>

## Description
- <what changed and why>
- <key implementation decisions>
- <affected modules>

## Test plan
- [ ] <verification step>
- [ ] <another verification step>
```

**Without issue reference** (omit the `## References` section entirely):

```
## Description
- <what changed and why>
- <key implementation decisions>
- <affected modules>

## Test plan
- [ ] <verification step>
- [ ] <another verification step>
```

### 10. Create the pull request

Create the PR targeting the `develop` branch:

```bash
gh pr create --base develop --title "<generated-title>" --body "<generated-body>"
```

### 11. Return the PR URL

Output the URL returned by `gh pr create` so the user can open and review the PR.

## Constraints

- Always analyze the diff before generating the branch name or PR content.
- Branch names must follow the `type/scope-description` convention — lowercase, hyphen-separated.
- PR titles must follow Conventional Commit format: `type(scope): description`.
- PR titles must be under 70 characters.
- Never invent a GitHub issue number.
- Only include `## References` if an issue number was extracted from the branch or commits.
- Always create the PR targeting `develop`.
- Do not include unrelated files or context in the description.
