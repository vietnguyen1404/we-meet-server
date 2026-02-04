# GitHub Copilot Agents

> Custom GitHub Copilot agents for specialized interactions and guided workflows.

## Overview

This directory contains custom GitHub Copilot agent files that create specialized conversational experiences. Agents are designed for specific workflows, providing guided assistance, contextual help, and domain-specific expertise.

Unlike prompts (which execute specific tasks) and instructions (which auto-apply to files), agents create **interactive conversational experiences** where the AI maintains context across multiple exchanges and provides step-by-step guidance.

## How GitHub Copilot Agents Work

Agents use a special `.agent.md` format that defines:
- **Persona and Expertise** - The AI's role and knowledge domain
- **Conversational Style** - How the AI interacts with users
- **Capabilities** - What the agent can help with
- **Context Management** - How state is maintained across conversations
- **Integration Points** - Connections to prompts, instructions, and other resources
- **Tools** - Available tools the agent can use (search, codebase analysis, etc.)

When you activate an agent, GitHub Copilot adopts that specific persona and follows the defined interaction patterns throughout your conversation.

## Available Agents

### `cookbook-assistant.agent.md`

**Interactive guide for navigating and using the Copilot Cookbook**

**Persona:** Friendly, knowledgeable guide who helps users discover and effectively use cookbook resources.

**Capabilities:**
- **Resource Discovery** - Helps find the right prompts, instructions, or workflows for your needs
- **Usage Guidance** - Explains how to use cookbook resources effectively
- **Workflow Recommendations** - Suggests appropriate workflows based on your project state
- **Customization Help** - Assists in adapting resources to your specific context
- **Best Practices** - Shares tips for getting the most out of the cookbook

**When to Use:**
- First time using the Copilot Cookbook
- Not sure which prompt or workflow to use
- Need help customizing resources
- Want to understand cookbook structure
- Looking for best practices and tips

**How to Activate:**
```
@cookbook-assistant
```

**Example Interactions:**
```
User: I have an existing project and need documentation
@cookbook-assistant: I recommend the brownfield workflow...

User: How do I create custom instructions for React?
@cookbook-assistant: Let me guide you through using /build-instruction...
```

## Using GitHub Copilot Agents

### Installation

Copy agent files to your project:

```bash
# Copy individual agent
cp cookbook-assistant.agent.md /path/to/your/project/.github/agents/

# Or copy all agents
cp *.agent.md /path/to/your/project/.github/agents/
```

### Activation

1. **Mention the agent** in Copilot Chat using `@` syntax:
   ```
   @cookbook-assistant help me get started
   ```

2. **The agent activates** and maintains its persona throughout the conversation

3. **Continue the conversation** - Ask follow-up questions, request clarifications, or dive deeper

### Best Practices

**Be Conversational:**
- Ask questions naturally
- Provide context about your situation
- Follow up based on recommendations

**Use for Guidance, Not Execution:**
- Agents help you understand what to do
- They recommend prompts and workflows
- For actual execution, use the specific prompts they suggest

**Maintain Context:**
- Keep conversations in the same chat thread
- Mention your project type and current state
- Share relevant details about your goals

## Creating Custom Agents

### Using the Builder

The easiest way to create agents is using the builder:

```bash
# Copy the builder to your project
cp ../.builders/build-agent.prompt.md /path/to/project/.github/

# Run it in Copilot Chat
/build-agent
```

The builder will guide you through:
1. Defining the agent's purpose and use cases
2. Designing the persona and conversational style
3. Specifying capabilities and expertise areas
4. Setting up context management and available tools
5. Establishing integration points with other resources

### Manual Creation

Follow this structure when creating agents manually:

```markdown
---
description: 'Clear description of agent purpose'
tools: ['search/codebase', 'search'] # Optional: specify available tools
---

# Agent Name

You are [persona description with expertise and style].

## Purpose & Scope

What this agent does and doesn't do:
- Primary responsibilities
- Scope limitations
- Specific use cases

## Capabilities

What you can help with:
- Capability 1
- Capability 2
- Capability 3

## Available Resources

Resources you can recommend:
- Related prompts
- Relevant instructions
- Helpful workflows

## Common Use Cases

Typical scenarios and recommended approaches.
```

## Agents vs Prompts vs Instructions

| Feature | Agents | Prompts | Instructions |
|---------|-----------|---------|--------------|
| **Activation** | `@agent` in conversation | `/prompt` as command | Auto-applied to files |
| **Purpose** | Guidance and assistance | Task execution | Coding standards |
| **Interaction** | Multi-turn conversation | Single execution | Background context |
| **State** | Maintains context | Stateless | Per-file context |
| **Best For** | Discovery, learning, guidance | Specific tasks | Consistent coding style |

## Directory Structure

```
agents/
├── README.md                      # This file
└── cookbook-assistant.agent.md    # Cookbook navigation assistant
```

## Related Resources

- **[Prompts Directory](../prompts/)** - Task-specific workflows that agents recommend
- **[Instructions Directory](../instructions/)** - Auto-applied coding standards
- **[Builders Directory](../.builders/)** - Tools to create custom agents
- **[Setup Workflows](../.setup/)** - Agent-guided project initialization workflows

---

**Need a custom agent?** Use the [build-agent](../.builders/build-agent.prompt.md) builder to create one with guided best practices.

**Want to improve an existing agent?** Use the [finalize-prompt](../.builders/finalize-prompt.prompt.md) tool to refine it.
