# Prompts

> Production-ready GitHub Copilot prompts for code analysis, project setup, and documentation generation.

## Overview

This directory contains reusable prompts designed for **GitHub Copilot agent mode**. Each prompt provides comprehensive, step-by-step instructions for complex development tasks that would typically require multiple manual steps.

All prompts follow GitHub Copilot's customization patterns with:
- Structured front matter for tool configuration
- Clear role definitions and expertise levels
- Step-by-step execution instructions
- Input validation and error handling
- Actionable output requirements

## Available Prompts

### 📊 Code Analysis & Evaluation

#### `evaluate-codebase.prompt.md`
**Comprehensive codebase analysis across five critical dimensions**

Performs deep evaluation covering:
- **Architecture & Design** - Patterns, SOLID principles, DRY compliance
- **Code Quality** - Complexity metrics, duplication, maintainability
- **Coding Conventions** - Style consistency, naming patterns, formatting
- **Performance & Scalability** - Bottlenecks, resource usage, optimization opportunities
- **Security** - Vulnerabilities, authentication, data protection

**Output:** Detailed analysis report with severity-rated findings (Critical, High, Medium, Low) and actionable recommendations.

**When to use:**
- Onboarding to an unfamiliar codebase
- Pre-release quality audits
- Technical debt assessment
- Architecture reviews
- Security audits

**Usage:**
```
/evaluate-codebase
```

---

#### `evaluate-coding-convention.prompt.md`
**Deep analysis of coding standards and style consistency**

Analyzes four key convention areas:
- **Language-Specific Conventions** - Idioms, syntax patterns, framework compliance
- **Naming Conventions** - Case consistency, descriptive names, file naming
- **Formatting & Structure** - Indentation, spacing, code organization
- **Comments & Documentation** - Inline docs, function docs, technical debt tracking

**Output:** Convention compliance report with industry standard comparisons (Airbnb, PEP 8, Google Style Guides) and improvement recommendations.

**When to use:**
- Establishing team coding standards
- Code review preparation
- Style guide enforcement
- Legacy code modernization
- Pre-PR quality checks

**Usage:**
```
/evaluate-coding-convention
```

---

### 🚀 Project Setup & Configuration

#### `generate-copilot-kit.prompt.md`
**Complete GitHub Copilot configuration generator**

Creates production-ready Copilot setup including:
- **Custom Prompts** - Task-specific workflows tailored to your stack
- **Instructions** - Framework-specific coding standards that auto-apply
- **Code Snippets** - Reusable templates and patterns
- **Testing Templates** - Test file generation based on your testing framework
- **Documentation** - Setup guide and team onboarding materials

**Process:**
1. **Discovery** - Analyzes existing documentation or explores codebase
2. **Research** - Leverages patterns from awesome-copilot repository
3. **Generation** - Creates complete `.github/` structure
4. **Documentation** - Provides usage guide and examples

**Output:** Complete `.github/` directory with prompts, instructions, snippets, and comprehensive documentation.

**When to use:**
- Setting up Copilot for a new project
- Standardizing Copilot usage across teams
- Migrating from ad-hoc to structured Copilot usage
- Onboarding teams to AI-assisted development

**Usage:**
```
/generate-copilot-kit
```

> **[!TIP]**
> This prompt checks for existing documentation in `docs/` first, then offers to explore your codebase or gather information interactively.

---

#### `generate-readme.prompt.md`
**Professional README generation with best practices**

Creates comprehensive README files with:
- Project overview and value proposition
- Key features and capabilities
- Installation and setup instructions
- Usage examples and API documentation
- Best practices and troubleshooting
- GFM formatting and GitHub admonitions

**Output:** Well-structured README.md following open-source best practices.

**When to use:**
- Creating README for new projects
- Improving existing documentation
- Standardizing documentation across repositories
- Open-source project releases

**Usage:**
```
/generate-readme
```

## How to Use

### Installation

Copy prompts to your project's `.github/prompts/` directory:

```bash
# Copy individual prompt
cp evaluate-codebase.prompt.md /path/to/your/project/.github/prompts/

# Or copy all prompts
cp *.prompt.md /path/to/your/project/.github/prompts/
```

### Execution

1. **Open GitHub Copilot Chat** in VS Code (agent mode)
2. **Reference the prompt** using slash commands:
   ```
   /evaluate-codebase
   ```
3. **Follow the interactive workflow** - Answer any questions if prompted
4. **Review the output** - The agent will create files or provide analysis

### Customization

All prompts can be customized by editing the `.prompt.md` files:

**Front Matter Configuration:**
```yaml
---
mode: 'agent'                    # Execution mode
model: 'Claude Sonnet 4'         # Optional: Preferred AI model
description: 'What it does'      # Brief description
tools: ['codebase', 'search']    # Required Copilot tools
---
```

**Input Variables:**
- `${file}` - Current file path
- `${selection}` - Selected code
- `${input:variableName:placeholder}` - User input
- `${workspaceFolder}` - Workspace root

## Prompt Structure

Each prompt follows this pattern:

```markdown
# Prompt Title

## Role
Defines AI expertise and persona

## Task / Mission
Clear objectives and success criteria

## Input Parameters
Variables and user-provided context

## Step-by-Step Instructions
Detailed execution process

## Output Requirements
Expected format and deliverables
```

## Best Practices

### When Writing Custom Prompts

**Be Specific with Roles:**
```markdown
❌ You are a software engineer
✅ You are a senior .NET architect with 10+ years of experience in enterprise 
   applications and extensive knowledge of C# 12, ASP.NET Core, and clean 
   architecture patterns
```

**Break Down Complex Tasks:**
```markdown
## Phase 1: Discovery
### Step 1: Analyze existing documentation
### Step 2: Gather missing information

## Phase 2: Research
### Step 3: Leverage proven patterns
### Step 4: Compare industry standards

## Phase 3: Implementation
### Step 5: Generate configuration files
### Step 6: Create documentation
```

**Specify Tool Requirements:**
```yaml
tools: ['codebase', 'search', 'edit', 'problems', 'usages']
```

**Provide Clear Success Criteria:**
```markdown
## Output Requirements
- ✅ All findings categorized by severity
- ✅ At least 3 specific recommendations per category
- ✅ Code examples for each recommendation
- ✅ Comparison with industry standards
```

### When Using Prompts

**Prepare Context:**
- Ensure relevant files are open or accessible
- Have necessary documentation ready
- Clear terminal output if needed

**Review Outputs:**
- Always review generated files before committing
- Customize recommendations to your context
- Test generated code thoroughly

**Iterate:**
- Run prompts multiple times as code evolves
- Update prompts based on team feedback
- Share improvements with the team


## Related Resources

- **[awesome-copilot](https://github.com/github/awesome-copilot)** - Curated collection of Copilot resources
- **[Instructions Directory](../instructions/)** - Auto-applied coding standards
- **[Builders Directory](../.builders/)** - Tools to create custom prompts
- **[Setup Workflows](../.setup/)** - Automated project initialization

---

**Need a custom prompt?** Use the [build-prompt](../.builders/build-prompt.prompt.md) builder to create one with guided best practices.

**Found an issue?** These prompts are battle-tested, but improvable. Feel free to customize them for your needs.
