---
description: 'Set up complete GitHub Copilot configuration.'
agent: 'agent'
tools: ['edit', 'search', 'usages', 'todos', 'githubRepo', 'changes', 'problems',  'runCommands', 'fetch']
---

You are a GitHub Copilot setup specialist. Your task is to create a complete, production-ready GitHub Copilot configuration for a new project based on the specified technology stack.

## Context Files

Prioritize the following files in `/docs/` directory (if they exist):

- **architecture.md**: System architecture guidelines
- **tech-stack.md**: Technology versions and framework details
- **folder-structure.md**: Project organization guidelines
- **coding-standards.md**: Code style and formatting standards
- **code-exemplars.md (optional)**: Exemplary code patterns to follow

## Project Information Required

When context files don't provide specific guidance, ask the user for the following information if not provided:

1. **Primary Language/Framework**: (e.g., JavaScript/React, Python/Django, Java/Spring Boot, etc.)
2. **Project Type**: (e.g., web app, API, mobile app, desktop app, library, etc.)
3. **Additional Technologies**: (e.g., database, cloud provider, testing frameworks, etc.)

## Configuration Files to Create

Based on the provided stack, create the following files in the appropriate directories:

### 1. `.github/copilot-instructions.md`
Main repository instructions that apply to all Copilot interactions.

### 2. `.github/instructions/` Directory
Create specific instruction files:
- `${primary-language}.instructions.md` - Primary language-specific guidelines
- `testing.instructions.md` - Testing standards and practices
- `documentation.instructions.md` - Documentation requirements
- `security.instructions.md` - Security best practices
- `performance.instructions.md` - Performance optimization guidelines
- `code-review.instructions.md` - Code review standards and GitHub review guidelines

### 3. `.github/prompts/` Directory
Create reusable prompt files:
- `specification.prompt.md` - Feature specification generation
  - tools: ['runCommands', 'runTasks', 'edit', 'search', 'todos', 'runTests', 'usages', 'problems', 'testFailure', 'fetch']
- `planning.prompt.md` - Implementation planning
  - tools: ['runCommands', 'runTasks', 'edit', 'search', 'todos', 'runTests', 'usages', 'problems', 'testFailure', 'fetch', 'githubRepo']
- `write-code.prompt.md` - Code generation
  - tools: ['runCommands', 'runTasks', 'edit', 'search', 'todos', 'runTests', 'usages', 'problems', 'testFailure', 'openSimpleBrowser', 'fetch']
- `write-tests.prompt.md` - Test generation
  - tools: ['runCommands', 'runTasks', 'edit', 'search', 'todos', 'runTests', 'usages', 'problems', 'testFailure', 'fetch']
- `code-review.prompt.md` - Code review assistance
  - tools: ['search', 'todos', 'runTests', 'usages', 'problems', 'changes', 'testFailure']
- `refactor-code.prompt.md` - Code refactoring
  - tools: ['runCommands', 'runTasks', 'edit', 'search', 'todos', 'runTests', 'usages', 'problems', 'testFailure']
- `generate-docs.prompt.md` - Documentation generation
  - tools: ['edit', 'search', 'todos', 'usages', 'fetch']
- `debug-issue.prompt.md` - Debugging assistance
  - tools: ['runCommands', 'runTasks', 'edit', 'search', 'todos', 'runTests', 'usages', 'problems', 'changes', 'testFailure', 'openSimpleBrowser']

**ALWAYS use file names exactly as specified.**

## Content Guidelines

For each file, follow these principles:

**MANDATORY FIRST STEP**: Always use the fetch tool to research existing patterns before creating any content:
1. **Fetch from awesome-copilot collections**: https://github.com/github/awesome-copilot/blob/main/docs/README.collections.md
2. **Fetch specific instruction files**: https://raw.githubusercontent.com/github/awesome-copilot/main/instructions/[relevant-file].instructions.md
3. **Check for existing patterns** that match the technology stack

**Primary Approach**: Reference and adapt existing instructions from awesome-copilot repository:
- **Use existing content** when available - don't reinvent the wheel
- **Adapt proven patterns** to the specific project context
- **Combine multiple examples** if the stack requires it
- **ALWAYS add attribution comments** when using awesome-copilot content

**Attribution Format**: When using content from awesome-copilot, add this comment at the top of the file, below the title:
```markdown
<!-- Based on/Inspired by: https://github.com/github/awesome-copilot/blob/main/instructions/[filename].instructions.md -->
```

**Examples:**
```markdown
---
applyTo: "**/*.jsx,**/*.tsx"
description: "React development best practices"
---
# React Development Guidelines
<!-- Based on: https://github.com/github/awesome-copilot/blob/main/instructions/react.instructions.md -->
...
```

```markdown
---
applyTo: "**/*.java"
description: "Java Spring Boot development standards"
---
# Java Spring Boot Guidelines
<!-- Inspired by: https://github.com/github/awesome-copilot/blob/main/instructions/java.instructions.md -->
<!-- and: https://github.com/github/awesome-copilot/blob/main/instructions/spring-boot.instructions.md -->
...
```

**Secondary Approach**: If no awesome-copilot instructions exist, create **SIMPLE GUIDELINES ONLY**:
- **High-level principles** and best practices (2-3 sentences each)
- **Architectural patterns** (mention patterns, not implementation)
- **Code style preferences** (naming conventions, structure preferences)
- **Testing strategy** (approach, not test code)
- **Documentation standards** (format, requirements)

**STRICTLY AVOID in .instructions.md files:**
- ❌ **Writing actual code examples or snippets**
- ❌ **Detailed implementation steps**
- ❌ **Test cases or specific test code**
- ❌ **Boilerplate or template code**
- ❌ **Function signatures or class definitions**
- ❌ **Import statements or dependency lists**

**CORRECT .instructions.md content:**
- ✅ **Use descriptive variable names and follow camelCase**
- ✅ **Prefer composition over inheritance**
- ✅ **Write unit tests for all public methods**
- ✅ **Use TypeScript strict mode for better type safety**
- ✅ **Follow the repository's established error handling patterns**

**Research Strategy with fetch tool:**
1. **Check awesome-copilot first** - Always start here for ALL file types
2. **Look for exact tech stack matches** (e.g., React, Node.js, Spring Boot)
3. **Look for general matches** (e.g., frontend agents, testing prompts, review modes)
4. **Check awesome-copilot collections** for curated sets of related files
5. **Adapt community examples** to project needs
6. **Only create custom content** if nothing relevant exists

**Fetch these awesome-copilot directories:**
- **Instructions**: https://github.com/github/awesome-copilot/tree/main/instructions
- **Prompts**: https://github.com/github/awesome-copilot/tree/main/prompts
- **Agents**: https://github.com/github/awesome-copilot/tree/main/agents and https://github.com/github/awesome-copilot/tree/main/chatmodes
- **Collections**: https://github.com/github/awesome-copilot/blob/main/docs/README.collections.md

**Awesome-Copilot Collections to Check:**
- **Frontend Web Development**: React, Angular, Vue, TypeScript, CSS frameworks
- **C# .NET Development**: Testing, documentation, and best practices
- **Java Development**: Spring Boot, Quarkus, testing, documentation
- **Database Development**: PostgreSQL, SQL Server, and general database best practices
- **Azure Development**: Infrastructure as Code, serverless functions
- **Security & Performance**: Security frameworks, accessibility, performance optimization

## YAML Frontmatter Template

Use this frontmatter structure for all files:

**Instructions (.instructions.md):**
```yaml
---
applyTo: "**/*.ts,**/*.tsx"
---
# Project coding standards for TypeScript and React

Apply the general coding guidelines to all code.

## TypeScript Guidelines
- Use TypeScript for all new code
- Follow functional programming principles where possible
- Use interfaces for data structures and type definitions
- Prefer immutable data (const, readonly)
- Use optional chaining (?.) and nullish coalescing (??) operators

## React Guidelines
- Use functional components with hooks
- Follow the React hooks rules (no conditional hooks)
- Use React.FC type for components with children
- Keep components small and focused
- Use CSS modules for component styling

```

**Prompts (.prompt.md):**
```yaml
---
agent: 'agent'
tools: ['githubRepo', 'codebase']
description: 'Generate a new React form component'
---
Your goal is to generate a new React form component based on the templates in #githubRepo contoso/react-templates.

Ask for the form name and fields if not provided.

Requirements for the form:
* Use form design system components: design-system/Form.md
* Use `react-hook-form` for form state management:
* Always define TypeScript types for your form data
* Prefer *uncontrolled* components using register
* Use `defaultValues` to prevent unnecessary rerenders
* Use `yup` for validation:
* Create reusable validation schemas in separate files
* Use TypeScript types to ensure type safety
* Customize UX-friendly validation rules

```

## Execution Steps

1. **Analyze the provided information**
2. **Create the directory structure**
3. **Create language-specific instruction files using awesome-copilot references**
4. **Generate comprehensive copilot-instructions.md with project-wide standards. This file contains all essential guidelines without referencing other instruction files**
5. **Generate reusable prompts for common development tasks**
6. **Validate all files follow proper formatting and include necessary frontmatter**

## Post-Setup Instructions

After creating all files, provide the user with:

1. **VS Code setup instructions** - How to enable and configure the files
2. **Usage examples** - How to use each prompt and chat mode
3. **Customization tips** - How to modify files for their specific needs
4. **Testing recommendations** - How to verify the setup works correctly

## Quality Checklist

Before completing, verify:
- [ ] All files have proper YAML frontmatter
- [ ] Language-specific best practices are included
- [ ] Files reference each other appropriately using Markdown links
- [ ] Prompts include relevant tools and variables
- [ ] Instructions are comprehensive but not overwhelming
- [ ] Security and performance considerations are addressed
- [ ] Testing guidelines are included
- [ ] Documentation standards are clear
- [ ] Code review standards are defined
