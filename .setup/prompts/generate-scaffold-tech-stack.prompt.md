---
description: 'Comprehensive technology stack blueprint generator for new projects that analyzes documentation files (/docs/*.md) to create detailed architectural documentation. Automatically detects technology stacks, programming languages, and implementation patterns across multiple platforms (.NET, Java, JavaScript, React, Python). Prompts users for missing information instead of exploring the codebase. Generates configurable blueprints with version information, licensing details, usage patterns, coding conventions, and visual diagrams. Provides implementation-ready templates and maintains architectural consistency for guided development.'
agent: 'setup-greenfield'
---

# Technology Stack Blueprint Generator for New Projects

## Configuration Variables
${PROJECT_TYPE="Auto-detect|.NET|Java|JavaScript|React.js|React Native|Angular|Python|Other"} <!-- Primary technology -->
${DEPTH_LEVEL="Basic|Standard|Comprehensive|Implementation-Ready"} <!-- Analysis depth -->
${INCLUDE_VERSIONS=true|false} <!-- Include version information -->
${INCLUDE_LICENSES=true|false} <!-- Include license information -->
${INCLUDE_DIAGRAMS=true|false} <!-- Generate architecture diagrams -->
${INCLUDE_USAGE_PATTERNS=true|false} <!-- Include code usage patterns -->
${INCLUDE_CONVENTIONS=true|false} <!-- Document coding conventions -->
${OUTPUT_FORMAT="Markdown|JSON|YAML|HTML"} <!-- Select output format -->
${CATEGORIZATION="Technology Type|Layer|Purpose"} <!-- Organization method -->

## Generated Prompt

"Generate a ${DEPTH_LEVEL} technology stack blueprint for a new project by analyzing documentation in the `/docs/` directory. If essential information is not found in the documentation, prompt the user to provide it rather than exploring the codebase. Use the following approach:

### 1. Documentation Analysis Phase
- Review all markdown files in `/docs/` directory for technology specifications
- Look for existing tech stack documentation, architecture diagrams, and requirements
- ${PROJECT_TYPE == "Auto-detect" ? "Identify technology stacks mentioned in the documentation" : "Focus on ${PROJECT_TYPE} technologies as specified"}
- Extract information about programming languages, frameworks, and libraries from documentation
- ${INCLUDE_VERSIONS ? "Note any version requirements specified in the documentation" : "Skip version details"}
- ${INCLUDE_LICENSES ? "Document any license requirements mentioned" : ""}

**If information is missing**: Ask the user to provide:
- Primary technology stack and frameworks
- Programming language(s) and versions
- Key dependencies and their purposes
- Architecture patterns to follow
- Development and deployment requirements

### 2. Core Technologies Specification

Based on documentation or user input, define technologies for:

${PROJECT_TYPE == ".NET" || PROJECT_TYPE == "Auto-detect" ? "#### .NET Stack (if applicable)
- Target frameworks and language versions
- Recommended NuGet packages with versions and purposes
- Project structure and organization patterns
- Configuration approach (appsettings.json, IOptions, etc.)
- Authentication mechanisms (Identity, JWT, etc.)
- API design patterns (REST, GraphQL, minimal APIs, etc.)
- Data access approaches (EF Core, Dapper, etc.)
- Dependency injection patterns
- Middleware pipeline components

**If not documented**: Ask user to specify framework version, key packages, and architectural patterns." : ""}

${PROJECT_TYPE == "Java" || PROJECT_TYPE == "Auto-detect" ? "#### Java Stack (if applicable)
- JDK version and core frameworks
- Maven/Gradle dependencies with versions and purposes
- Package structure organization
- Spring Boot usage and configurations
- Annotation patterns
- Dependency injection approach
- Data access technologies (JPA, JDBC, etc.)
- API design (Spring MVC, JAX-RS, etc.)

**If not documented**: Ask user for Java version, framework choices, and build tool preference." : ""}

${PROJECT_TYPE == "JavaScript" || PROJECT_TYPE == "Auto-detect" ? "#### JavaScript Stack (if applicable)
- ECMAScript version and transpiler settings
- npm dependencies categorized by purpose
- Module system (ESM, CommonJS)
- Build tooling (webpack, Vite, Rollup, etc.) with configuration
- TypeScript usage and configuration
- Testing frameworks and patterns

**If not documented**: Ask user for Node version, TypeScript preference, and build tool choice." : ""}

${PROJECT_TYPE == "React.js" || PROJECT_TYPE == "Auto-detect" ? "#### React Stack (if applicable)
- React version and preferred patterns (hooks vs class components)
- State management approach (Context, Redux, Zustand, etc.)
- Component library (Material-UI, Chakra, Ant Design, etc.)
- Routing implementation (React Router, etc.)
- Form handling strategies
- API integration patterns
- Testing approach for components

**If not documented**: Ask user for React version, state management preference, and UI library choice." : ""}

${PROJECT_TYPE == "Python" || PROJECT_TYPE == "Auto-detect" ? "#### Python Stack (if applicable)
- Python version and key language features
- Package dependencies and virtual environment approach
- Web framework (Django, Flask, FastAPI)
- ORM usage patterns
- Project structure organization
- API design patterns

**If not documented**: Ask user for Python version, framework choice, and project structure preference." : ""}

### 3. Implementation Patterns & Conventions
${INCLUDE_CONVENTIONS ?
"Define or extract coding conventions and patterns from documentation:

#### Naming Conventions
- Class/type naming patterns
- Method/function naming patterns
- Variable naming conventions
- File naming and organization conventions
- Interface/abstract class patterns

**If not documented**: Ask user for preferred naming conventions and style guide.

#### Code Organization
- File structure and organization
- Folder hierarchy patterns
- Component/module boundaries
- Code separation and responsibility patterns

**If not documented**: Ask user for preferred project structure and organization approach.

#### Standard Patterns
- Error handling approaches
- Logging patterns
- Configuration access
- Authentication/authorization implementation
- Validation strategies
- Testing patterns

**If not documented**: Ask user to specify standard patterns for error handling, logging, and testing." : ""}

### 4. Usage Examples & Templates
${INCLUDE_USAGE_PATTERNS ?
"Create or extract representative code templates showing standard implementation patterns:

#### API Implementation Templates
- Standard controller/endpoint implementation
- Request DTO pattern
- Response formatting
- Validation approach
- Error handling

**If not documented**: Ask user for preferred API design patterns and response structures.

#### Data Access Templates
- Repository pattern implementation
- Entity/model definitions
- Query patterns
- Transaction handling

**If not documented**: Ask user for preferred data access patterns and ORM approach.

#### Service Layer Templates
- Service class implementation
- Business logic organization
- Cross-cutting concerns integration
- Dependency injection usage

**If not documented**: Ask user for service layer architecture preferences.

#### UI Component Templates (if applicable)
- Component structure
- State management pattern
- Event handling
- API integration pattern

**If not documented**: Ask user for component architecture and state management approach." : ""}

### 5. Technology Stack Map
${DEPTH_LEVEL == "Comprehensive" || DEPTH_LEVEL == "Implementation-Ready" ?
"Create a comprehensive technology map from documentation or user input:

#### Core Framework Configuration
- Primary frameworks and their intended usage
- Framework-specific configurations and customizations
- Extension points and customizations

**If not documented**: Ask user for framework selection rationale and configuration preferences.

#### Integration Points
- How different technology components should integrate
- Authentication flow between components
- Data flow between frontend and backend
- Third-party service integration patterns

**If not documented**: Ask user to describe integration requirements and data flow.

#### Development Tooling
- IDE settings and conventions
- Code analysis tools
- Linters and formatters with configuration
- Build and deployment pipeline
- Testing frameworks and approaches

**If not documented**: Ask user for development tooling preferences and CI/CD requirements.

#### Infrastructure
- Target deployment environment
- Container technologies
- Cloud services to utilize
- Monitoring and logging infrastructure

**If not documented**: Ask user for deployment targets and infrastructure requirements." : ""}

### 6. Technology-Specific Implementation Details

${PROJECT_TYPE == ".NET" || PROJECT_TYPE == "Auto-detect" ?
"#### .NET Implementation Details (if applicable)
- **Dependency Injection Pattern**:
  - Service registration approach (Scoped/Singleton/Transient patterns)
  - Configuration binding patterns

- **Controller Patterns**:
  - Base controller usage
  - Action result types and patterns
  - Route attribute conventions
  - Filter usage (authorization, validation, etc.)

- **Data Access Patterns**:
  - ORM configuration and usage
  - Entity configuration approach
  - Relationship definitions
  - Query patterns and optimization approaches

- **API Design Patterns**:
  - Endpoint organization
  - Parameter binding approaches
  - Response type handling

- **Language Features**:
  - Preferred C# language features
  - Common patterns and idioms
  - Version-specific features to use

**If not documented**: Ask user for .NET architectural decisions and implementation preferences." : ""}

${PROJECT_TYPE == "React.js" || PROJECT_TYPE == "Auto-detect" ?
"#### React Implementation Details (if applicable)
- **Component Structure**:
  - Function vs class components preference
  - Props interface definitions
  - Component composition patterns

- **Hook Usage Patterns**:
  - Custom hook implementation style
  - useState patterns
  - useEffect cleanup approaches
  - Context usage patterns

- **State Management**:
  - Local vs global state decisions
  - State management library patterns
  - Store configuration
  - Selector patterns

- **Styling Approach**:
  - CSS methodology (CSS modules, styled-components, Tailwind, etc.)
  - Theme implementation
  - Responsive design patterns

**If not documented**: Ask user for React architectural decisions and component design preferences." : ""}

### 7. Blueprint for New Code Implementation
${DEPTH_LEVEL == "Implementation-Ready" ?
"Create a detailed blueprint for implementing new features:

- **File/Class Templates**: Standard structure for common component types
- **Code Snippets**: Ready-to-use code patterns for common operations
- **Implementation Checklist**: Standard steps for implementing features end-to-end
- **Integration Points**: How to connect new code with existing systems
- **Testing Requirements**: Standard test patterns for different component types
- **Documentation Requirements**: Standard documentation patterns for new features

**If not documented**: Ask user for:
  - Preferred project structure and file organization
  - Code templates for common components
  - Testing strategy and coverage requirements
  - Documentation standards" : ""}

${INCLUDE_DIAGRAMS ?
"### 8. Technology Relationship Diagrams
Generate visual representations:
- **Stack Diagram**: Visual representation of the complete technology stack
- **Dependency Flow**: How different technologies interact
- **Component Relationships**: How major components depend on each other
- **Data Flow**: How data flows through the technology stack

**If information is insufficient**: Ask user to provide architectural diagrams or describe the system architecture." : ""}

### ${INCLUDE_DIAGRAMS ? "9" : "8"}. Technology Decision Context
Document technology choices and constraints:
- Reasons for technology selections (from documentation or user input)
- Technology constraints and boundaries
- Scalability and performance considerations
- Security requirements and compliance needs
- Technology upgrade paths and compatibility considerations

**If not documented**: Ask user to explain:
- Technology selection rationale
- Known constraints or limitations
- Non-functional requirements
- Future scalability plans

Format the output as ${OUTPUT_FORMAT} and categorize technologies by ${CATEGORIZATION}.

### Output Requirements
- Start by analyzing existing `/docs/*.md` files for technology specifications
- For any missing critical information, prompt the user with specific questions
- Do NOT explore the codebase or scan project files
- Generate a comprehensive technology stack blueprint based on documentation and user input
- Include clear sections for each technology area
- Provide actionable templates and examples for new feature implementation

Save the final output to '/docs/tech-stack.md'
"
