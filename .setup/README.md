# Project Setup Automation

> Automated workflows and prompts for comprehensive project initialization - transforming setup from hours of manual work into guided, repeatable processes.

## Overview

The `.setup` directory provides systematic automation for both **greenfield** (new) and **brownfield** (existing) project setup. Instead of manually creating documentation, configurations, and GitHub Copilot integrations, these workflows guide you through multi-step processes that generate everything your project needs.

## What Gets Generated

Both workflows produce a complete project foundation:

### Documentation Suite
- **Architecture Documentation** - Comprehensive architectural patterns, components, and design decisions
- **Tech Stack Documentation** - Detailed technology stack analysis with dependencies and tooling
- **Folder Structure** - Project organization with purpose and conventions for each directory
- **Code Exemplars/Conventions** - Reference implementations and coding standards

### GitHub Copilot Kit
- **Root Instructions** - Core project-wide instructions in `.github/copilot-instructions.md`
- **Context-Specific Instructions** - Auto-applied patterns in `.github/instructions/*.instructions.md`
- **Reusable Prompts** - Task-specific agent prompts in `.github/prompts/*.prompt.md`

### Optional Enhancements
- Security guidelines (OWASP-based secure coding practices)
- Performance optimization guides
- API documentation standards

## VS Code Configuration

To enable GitHub Copilot to recognize and use prompts from the `.setup` directory, add the following configuration to your project's `.vscode/settings.json`:

```json
{
  "chat.promptFilesLocations": {
    ".github/prompts": false,
    ".setup/prompts": true
  },
  "chat.promptFilesRecommendations": {
    "setup-greenfield": true,
    "setup-brownfield": true
  }
}
```

This configuration enables all setup prompts as slash commands in Copilot Chat (e.g., `/setup-brownfield`, `/generate-codebase-architecture`, `/generate-scaffold-architecture`).

> [!NOTE]
> If you already have other prompt locations configured, add `.setup/prompts` to the existing configuration rather than replacing it.

## Quick Start

### Agent-Based Execution (Recommended)

Use the automated agents for the most streamlined experience:

**For Existing Projects (Brownfield):**
```
@setup-brownfield
```

**For New Projects (Greenfield):**
```
@setup-greenfield
```

These agents will guide you through the entire workflow with intelligent step coordination and validation.

### Manual Workflow Execution

Reference workflow steps individually based on your project type:

**For Existing Projects (Brownfield):**

Quick start
```
/setup-brownfield
```

Or perform step-by-step
```
/generate-codebase-architecture
/generate-codebase-folder-structure
/generate-codebase-tech-stack
/generate-codebase-exemplars
/generate-codebase-coding-standards
/generate-copilot-kit
```

**For New Projects (Greenfield):**

Quick start
```
/setup-greenfield
```

Or perform step-by-step
```
/generate-scaffold-architecture
/generate-scaffold-tech-stack
/generate-scaffold-folder-structure
/generate-scaffold-coding-standards
/generate-copilot-kit
```

## Workflows

### Brownfield Setup (`workflows/brownfield.yaml`)

**Purpose:** Enhance existing projects with comprehensive documentation and GitHub Copilot integration.

**When to Use:**
- Existing codebases lacking documentation
- Projects needing GitHub Copilot assistance
- Legacy projects requiring modernization
- Onboarding documentation for mature projects

**Process:**
1. **Analyze Architecture** - Reverse-engineer architectural patterns from existing code
2. **Document Structure** - Map current folder organization and conventions
3. **Catalog Tech Stack** - Identify all technologies, frameworks, and dependencies
4. **Extract Exemplars** - Find representative code examples for key patterns
5. **Extract Coding Standards** - Identify existing coding conventions and patterns
6. **Generate Copilot Kit** - Create instructions and prompts based on actual codebase

> **[!TIP]**
> The brownfield workflow uses **analysis-based prompts** that examine your codebase to generate accurate documentation reflecting reality, not assumptions.

### Greenfield Setup (`workflows/greenfield.yaml`)

**Purpose:** Bootstrap new projects with architecture, conventions, and tooling from the start.

**When to Use:**
- Starting new projects from scratch
- Proof-of-concepts transitioning to production
- Projects requiring architectural documentation before coding
- Teams establishing standards for new initiatives

**Process:**
1. **Define Architecture** - Design architectural blueprint based on requirements
2. **Specify Tech Stack** - Document chosen technologies with rationale
3. **Plan Structure** - Design folder organization and conventions
4. **Establish Standards** - Define coding standards and best practices
5. **Generate Copilot Kit** - Create instructions aligned with planned architecture

> **[!TIP]**
> The greenfield workflow uses **requirements-gathering prompts** that interview you about project needs before generating prescriptive documentation.

## Directory Structure

```
.setup/
├── README.md                                          # This file
├── agents/                                            # Agent definitions
│   ├── setup-brownfield.agent.md                     # Brownfield workflow agent
│   └── setup-greenfield.agent.md                     # Greenfield workflow agent
├── prompts/                                           # Step-specific prompts
│   ├── generate-codebase-architecture.prompt.md      # Brownfield architecture analysis
│   ├── generate-codebase-coding-standards.prompt.md  # Brownfield coding standards extraction
│   ├── generate-codebase-exemplars.prompt.md         # Brownfield code examples
│   ├── generate-codebase-folder-structure.prompt.md  # Brownfield structure documentation
│   ├── generate-codebase-tech-stack.prompt.md        # Brownfield tech analysis
│   ├── generate-copilot-kit.prompt.md                # Copilot configuration generator (shared)
│   ├── generate-scaffold-architecture.prompt.md      # Greenfield architecture design
│   ├── generate-scaffold-coding-standards.prompt.md  # Greenfield standards definition
│   ├── generate-scaffold-folder-structure.prompt.md  # Greenfield structure planning
│   ├── generate-scaffold-tech-stack.prompt.md        # Greenfield tech selection
│   ├── setup-brownfield.prompt.md                    # Brownfield workflow entrypoint
│   └── setup-greenfield.prompt.md                    # Greenfield workflow entrypoint
└── workflows/                                         # Workflow definitions
    ├── brownfield.yaml                               # Existing project workflow
    └── greenfield.yaml                               # New project workflow
```

## Prompt Details

### Shared Prompts

#### `generate-copilot-kit.prompt.md`
Generates a complete GitHub Copilot configuration suite by analyzing project documentation and structure.

**Inputs:** Architecture, tech stack, and convention documentation  
**Outputs:** `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md`, `.github/prompts/*.prompt.md`  
**Mode:** Agent  
**Duration:** 3-5 minutes

### Brownfield Prompts (Analysis-Based)

#### `generate-codebase-architecture.prompt.md`
Reverse-engineers architectural patterns by analyzing folder structure, dependencies, and design patterns.

**Capabilities:**
- Auto-detects technology stack and architectural patterns
- Generates C4/UML/component diagrams
- Documents layers, components, and their interactions
- Identifies extension points and design patterns

**Configuration:** `${PROJECT_TYPE}`, `${ARCHITECTURE_PATTERN}`, `${DIAGRAM_TYPE}`, `${DETAIL_LEVEL}`

#### `generate-codebase-folder-structure.prompt.md`
Maps project organization with descriptions of each directory's purpose and conventions.

#### `generate-codebase-tech-stack.prompt.md`
Catalogs all technologies, frameworks, libraries, and tools by analyzing dependencies and configurations.

#### `generate-codebase-exemplars.prompt.md`
Extracts representative code samples demonstrating key patterns, components, and practices.

#### `generate-codebase-coding-standards.prompt.md`
Analyzes existing code to identify and document current coding conventions, naming patterns, and style guidelines.

### Greenfield Prompts (Requirements-Based)

#### `generate-scaffold-architecture.prompt.md`
Designs architectural blueprint through interactive requirements gathering.

**Gathers:**
- Project overview and business objectives
- Technical requirements and constraints
- Architectural preferences and patterns
- Non-functional requirements
- Team context and development workflow

**Produces:** Prescriptive architecture document with implementation guidance

#### `generate-scaffold-tech-stack.prompt.md`
Documents technology choices with rationale based on project requirements.

#### `generate-scaffold-folder-structure.prompt.md`
Designs folder organization aligned with chosen architecture and conventions.

#### `generate-scaffold-coding-standards.prompt.md`
Establishes coding standards, naming conventions, and best practices for the new project.

## Workflow Execution Tips

### Best Practices

1. **Choose the Right Workflow** - Select brownfield for existing projects or greenfield for new ones
2. **Run Steps in Order** - Each step builds on previous outputs
3. **Review Before Next Step** - Ensure generated content is accurate before proceeding
4. **Customize Optional Steps** - Add security, performance, or API docs as needed
5. **Iterate if Needed** - Re-run specific steps to refine outputs

### Common Scenarios

**Scenario: Legacy Project Modernization**
```
# Use Brownfield workflow
/generate-codebase-architecture
/generate-codebase-folder-structure
/generate-codebase-tech-stack
/generate-codebase-exemplars
/generate-codebase-coding-standards
/generate-copilot-kit
# Optional: Add security and performance docs
```

**Scenario: MVP to Production Transition**
```
# Use Brownfield workflow (analyze existing MVP)
/generate-codebase-architecture
/generate-codebase-coding-standards
# Then: Use greenfield prompts for planned architecture
/generate-scaffold-architecture
/generate-scaffold-coding-standards
# Result: Documentation of current + target state
```

**Scenario: New Microservice**
```
# Use Greenfield workflow
/generate-scaffold-architecture
/generate-scaffold-tech-stack
/generate-scaffold-folder-structure
/generate-scaffold-coding-standards
/generate-copilot-kit
# Architecture: Event-Driven or Hexagonal
# Focus: Clear boundaries and integration patterns
```

## Output Locations

Workflows generate files in standardized locations:

```
<project-root>/
├── docs/
│   ├── architecture.md              # Architectural documentation
│   ├── folder-structure.md          # Project organization
│   ├── tech-stack.md                # Technology catalog
│   ├── coding-standards.md          # Coding conventions and standards
│   ├── code-exemplars.md            # Brownfield code examples (optional)
│   ├── secure-coding.md             # Optional: Security guidelines
│   ├── performance.md               # Optional: Performance practices
│   └── api-documentation.md         # Optional: API standards
└── .github/
    ├── copilot-instructions.md      # Root Copilot configuration
    ├── instructions/
    │   └── *.instructions.md        # Auto-applied context instructions
    └── prompts/
        └── *.prompt.md              # Project-specific agent prompts
```

## Troubleshooting

### Workflow Issues

**Problem:** Steps generate incorrect or outdated information

**Solution:** 
- Ensure codebase is up-to-date before running brownfield workflows
- For greenfield, provide detailed requirements when prompted
- Re-run specific steps with refined inputs

**Problem:** Assistant recommends wrong workflow

**Solution:**
- Manually specify workflow type in your request
- Provide more context about project state (new vs existing)

**Problem:** Generated Copilot Kit doesn't match project needs

**Solution:**
- Review and edit intermediate documentation (`docs/`) before running `generate-copilot-kit`
- Use custom prompts from `.builders/` to create specialized instructions

### Output Issues

**Problem:** Missing or incomplete generated files

**Solution:**
- Check that all prerequisite steps completed successfully
- Verify file paths in workflow YAML match your project structure
- Re-run the failed step with increased detail level

## Contributing

To add new workflows or improve existing ones:

1. **Create Workflow YAML** - Define steps, prompts, and outputs in `workflows/`
2. **Add Prompts** - Create step-specific prompts in `prompts/`
3. **Document** - Update this README with new workflow details

## Related Resources

- [Main Cookbook README](../README.md) - Overview of all cookbook resources
- [Prompt Templates](../prompts/) - Ongoing development task prompts
- [Instructions](../instructions/) - Auto-applied coding standards
- [Builders](../.builders/) - Meta-prompts for creating new resources

---

**Next Steps:**
1. Choose appropriate workflow (brownfield for existing projects, greenfield for new projects)
2. Run workflow prompts in sequence
3. Review generated documentation in `docs/`
4. Use generated prompts in `.github/prompts/` for development tasks
5. Apply auto-instructions from `.github/instructions/` during coding
