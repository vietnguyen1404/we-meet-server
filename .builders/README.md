# Builders - Meta-Prompt Engineering Tools

> Self-improving prompt infrastructure: Tools that help you create, refine, and optimize GitHub Copilot prompts and instructions.

## Overview

The `.builders` directory contains meta-prompts—prompts that help you build better prompts. These are the foundation of a self-improving system where GitHub Copilot assists in creating and refining its own customization files.

Think of builders as the "prompt factory" for your Copilot Cookbook, enabling systematic creation of high-quality prompts and instructions that follow established patterns and best practices.

## Available Builders

### 🔨 `build-prompt.prompt.md`

**Purpose**: Interactive prompt creation wizard that guides you through building production-ready `.prompt.md` files.

**Use Cases**:
- Creating new task-specific prompts from scratch
- Ensuring proper front matter configuration
- Implementing appropriate tool integrations
- Following established prompt patterns

**Key Features**:
- Structured discovery process with targeted questions
- Persona design guidance for optimal AI behavior
- Tool selection recommendations based on task requirements
- Output format optimization
- Quality validation criteria

**Usage**:
```
/build-prompt
```

The agent will guide you through:
1. Prompt identity and purpose definition
2. Persona and expertise specification
3. Task and constraint clarification
4. Context and variable requirements
5. Detailed instruction mapping
6. Output format definition
7. Tool capability selection
8. Quality criteria establishment

### 📋 `build-instruction.prompt.md`

**Purpose**: Comprehensive instruction file generator for coding standards, setup procedures, and best practices.

**Use Cases**:
- Creating `.instructions.md` files for coding standards
- Documenting framework-specific patterns
- Establishing team conventions
- Extracting patterns from existing codebases

**Key Features**:
- Analyzes existing code patterns when requested
- Supports multiple domains (components, APIs, testing, deployment)
- Auto-generates proper `applyTo` patterns
- Includes comprehensive sections (standards, patterns, error handling, testing)
- Ensures consistency with existing instruction files

**Usage**:
```
/build-instruction
```

The agent will ask about:
1. Instruction scope and domain
2. Target audience and complexity level
3. File patterns and naming
4. Content requirements and examples
5. Integration with existing standards

### 💬 `build-agent.prompt.md`

**Purpose**: Interactive agent creation wizard that guides you through building custom `.agent.md` files for specialized interactions.

**Use Cases**:
- Creating custom agents for specialized workflows
- Building domain-specific AI assistants
- Establishing conversational patterns for team collaboration
- Creating guided experiences for complex tasks

**Key Features**:
- Structured discovery process for agent design
- Persona and expertise configuration
- Multi-turn conversation pattern design
- Context management and state handling
- Integration with existing prompts and instructions

**Usage**:
```
/build-agent
```

The agent will guide you through:
1. Agent identity and purpose definition
2. Persona and conversational style specification
3. Use case and interaction pattern design
4. Context requirements and state management
5. Integration points with other cookbook resources
6. Quality validation criteria

### ✨ `finalize-prompt.prompt.md`

**Purpose**: Polish and refine existing prompts using proven patterns and best practices.

**Use Cases**:
- Improving clarity and structure of draft prompts
- Aligning prompts with established patterns
- Fixing grammar, spelling, and formatting issues
- Optimizing for AI consumption

**Key Features**:
- Maintains original intent while improving clarity
- Preserves front matter and markdown structure
- Applies best practices from successful prompts
- Ensures consistency across prompt files

**Usage**:
```
/finalize-prompt
```

Provide the prompt file you want to refine, and the agent will:
- Review structure and organization
- Correct clarity and grammar issues
- Align with proven patterns
- Optimize wording for AI understanding

## VS Code Configuration

To enable GitHub Copilot to recognize and use the builder prompts, add this configuration to your workspace or user settings (`.vscode/settings.json`):

```json
{
  "chat.promptFilesLocations": {
    ".builders": true
  }
}
```

This configuration tells VS Code to:
- Scan the `.builders` directory for `.prompt.md` files
- Make builder prompts available via slash commands in Copilot Chat
- Enable auto-completion when typing `/` in the chat interface

After adding this configuration, restart VS Code or reload the window for changes to take effect. You should then see `/build-prompt`, `/build-agent`, `/build-instruction`, and `/finalize-prompt` available in Copilot Chat.

## Best Practices

### When Creating New Prompts

1. **Start with /build-prompt**: Let the guided workflow ensure you don't miss critical elements
2. **Be specific about personas**: Define exact expertise levels and domain knowledge
3. **List all tools needed**: Review the tool requirements carefully
4. **Include validation criteria**: Define how success should be measured
5. **Test before deploying**: Run your prompt on sample scenarios

### When Creating Instructions

1. **Analyze existing code first**: Use `/build-instruction` with codebase analysis for consistency
2. **Define clear file patterns**: Use precise `applyTo` patterns to avoid conflicts
3. **Include concrete examples**: Show both good patterns and anti-patterns
4. **Cross-reference related files**: Link to other relevant instructions
5. **Keep it actionable**: Provide specific, implementable guidance

### When Finalizing Prompts

1. **Review for clarity**: Ensure instructions are unambiguous
2. **Check tool alignment**: Verify tools match the actual requirements
3. **Validate front matter**: Confirm all metadata is correct
4. **Test the refined version**: Compare output quality before and after

## File Structure Standards

All builder outputs follow consistent patterns:

**Prompt Files** (`.prompt.md`):
```markdown
---
description: 'Clear one-sentence description'
mode: 'agent|ask|edit'
tools: ['tool1', 'tool2']
---

# Prompt Title

[Persona definition]

## Task Section
## Instructions Section
## Output Section
## Validation Section
```

**Instruction Files** (`.instructions.md`):
```markdown
---
description: 'What this instruction covers'
applyTo: '**/*.{ext}'
---

# Instruction Title

## Core Requirements
## Implementation Patterns
## Best Practices
## Error Handling
## Testing Guidelines
```

**Agent Files** (`.agent.md`):
```markdown
---
description: 'Clear description of agent purpose'
---

# Agent Title

[Persona and conversational style definition]

## Capabilities Section
## Interaction Patterns Section
## Context Management Section
## Example Conversations Section
```

## Integration with Copilot Cookbook

Builders are designed to maintain consistency across the entire cookbook:

- **Pattern Recognition**: Analyzes existing prompts and instructions to extract successful patterns
- **Consistency Enforcement**: Ensures new files align with established conventions
- **Best Practice Application**: Incorporates lessons from high-performing prompts
- **Cross-Reference Support**: Links related resources automatically

## Tips for Effective Use

> **[!TIP]**
> Use builders iteratively. Create a draft with `/build-prompt`, test it, then refine with `/finalize-prompt`.

> [!NOTE]
> Builders can analyze your existing codebase. Answer "yes" when asked about codebase analysis to extract current patterns.

> [!IMPORTANT]
> Always test generated prompts before deploying to your team. Builders provide structure, but validation ensures quality.

## Contributing New Builders

When adding new builder prompts:

1. Follow the established patterns in existing builders
2. Include comprehensive discovery questions
3. Provide clear output format specifications
4. Add quality validation criteria
5. Document integration points with other builders
6. Update this README with the new builder

## Directory Structure

```
.builders/
├── README.md                      # This file
├── build-prompt.prompt.md         # Interactive prompt creation wizard
├── build-agent.prompt.md          # Agent creation wizard
├── build-instruction.prompt.md    # Instruction file generator
└── finalize-prompt.prompt.md      # Prompt refinement tool
```

---

**Ready to build?** Start with `/build-prompt`, `/build-agent`, or `/build-instruction` to create your first meta-engineered Copilot resource.
