---
description: 'Technology-agnostic prompt generator that creates comprehensive coding convention documentation for new projects. Leverages existing architectural and technical documentation to establish standards, best practices, and guidelines across multiple programming languages (.NET, Java, JavaScript, TypeScript, React, Angular, Python) with configurable detail levels and organizational structures.'
agent: 'setup-greenfield'
---

# Coding Standards Generator for New Projects

## Configuration Variables
${PROJECT_TYPE="Auto-detect|.NET|Java|JavaScript|TypeScript|React|Angular|Python|Other"} <!-- Primary technology stack -->
${DETAIL_LEVEL="Basic|Standard|Comprehensive"} <!-- Depth of convention documentation -->
${INCLUDE_CODE_EXAMPLES=true|false} <!-- Include illustrative code examples -->
${ORGANIZATION="By Category|By Layer|By Language Feature"} <!-- How to structure the document -->
${INCLUDE_ANTIPATTERNS=true|false} <!-- Include common mistakes and anti-patterns to avoid -->

## Generated Prompt

"Generate a comprehensive `/docs/coding-standards.md` file for a new ${PROJECT_TYPE} project. This document will establish coding standards, best practices, and guidelines to ensure consistency and maintainability across the development team.

### Context Files

Review and incorporate insights from the following documentation files in `/docs` (if they exist):

- **architecture.md**: System architecture patterns and design principles
- **tech-stack.md**: Technology versions, frameworks, and tool choices
- **folder-structure.md**: Project organization and file structure guidelines

Use these documents to align coding conventions with the project's architectural decisions and technical constraints.

### 1. Foundation and Principles

Define core coding principles based on ${PROJECT_TYPE} best practices:
- Code readability and maintainability
- Consistent naming conventions
- Clear separation of concerns
- Adherence to SOLID principles
- DRY (Don't Repeat Yourself)
- KISS (Keep It Simple, Stupid)
- Effective error handling and validation
- Comprehensive documentation and comments

### 2. Language-Specific Conventions

${PROJECT_TYPE == "Auto-detect" ? "Detect the primary technology stack and provide conventions for:" : `Provide detailed conventions for ${PROJECT_TYPE}:`}

### 3. Technology-Specific Standards

${PROJECT_TYPE == ".NET" || PROJECT_TYPE == "Auto-detect" ? `#### .NET Conventions
- **Naming Conventions**: PascalCase for classes/methods, camelCase for variables, prefix interfaces with 'I'
- **Domain Models**: Proper encapsulation, immutability where appropriate, domain logic placement
- **Repository Pattern**: Interface definitions, async/await usage, generic repository considerations
- **Service Layer**: Dependency injection patterns, service lifetimes, error handling
- **API Controllers**: Attribute routing, action result types, model validation, response formatting
- **Middleware**: Order of execution, custom middleware structure, exception handling middleware
- **Configuration**: Options pattern, appsettings.json structure, environment-specific settings
- **Async/Await**: Proper async method signatures, ConfigureAwait usage, avoiding async void
- **LINQ**: Query syntax vs method syntax, deferred execution awareness
- **Unit Testing**: Arrange-Act-Assert pattern, mocking strategies, test naming conventions` : ""}

${(PROJECT_TYPE == "JavaScript" || PROJECT_TYPE == "TypeScript" || PROJECT_TYPE == "React" || PROJECT_TYPE == "Angular" || PROJECT_TYPE == "Auto-detect") ? `#### Frontend Conventions
- **Naming Conventions**: Component names (PascalCase), functions/variables (camelCase), constants (UPPER_SNAKE_CASE)
- **Component Structure**: Functional vs class components, component composition, prop naming
- **State Management**: Local vs global state, state update patterns, immutability principles
- **TypeScript Usage**: Type definitions, interface vs type, generic usage, avoiding 'any'
- **Hooks**: Custom hooks creation, dependency arrays, hook ordering
- **API Integration**: Service layer structure, error handling, loading states, data transformation
- **Styling**: CSS modules, styled-components, naming conventions, responsive design
- **Form Handling**: Controlled components, validation libraries, error display
- **Routing**: Route structure, parameter handling, navigation guards
- **Testing**: Component testing, mocking API calls, user interaction testing` : ""}

${PROJECT_TYPE == "Java" || PROJECT_TYPE == "Auto-detect" ? `#### Java Conventions
- **Naming Conventions**: CamelCase for classes, camelCase for methods/variables, UPPER_SNAKE_CASE for constants
- **Package Structure**: Proper organization by layer and feature
- **Entity Classes**: JPA annotations, entity relationships, equals/hashCode implementation
- **Service Layer**: Transaction management, exception handling, business logic organization
- **Repository Layer**: Spring Data JPA conventions, custom query methods, query optimization
- **REST Controllers**: RESTful design, request/response DTOs, HTTP status codes
- **Exception Handling**: Custom exceptions, @ControllerAdvice, error response format
- **Dependency Injection**: Constructor injection preference, @Autowired usage
- **Lombok**: Appropriate annotation usage, avoiding overuse
- **Testing**: JUnit 5, Mockito, integration test structure` : ""}

${PROJECT_TYPE == "Python" || PROJECT_TYPE == "Auto-detect" ? `#### Python Conventions
- **Naming Conventions**: PEP 8 compliance, snake_case for functions/variables, PascalCase for classes
- **Type Hints**: Function signatures, variable annotations, generic types
- **Docstrings**: Google/NumPy/Sphinx style, function/class documentation
- **Class Design**: Properties, class methods, static methods, dunder methods
- **Async Programming**: async/await patterns, asyncio best practices
- **API Design**: FastAPI/Flask conventions, request validation, response models
- **ORM Usage**: SQLAlchemy patterns, relationship definitions, query optimization
- **Error Handling**: Exception hierarchy, context managers, proper exception raising
- **Virtual Environments**: Dependency management, requirements.txt/poetry/pipenv
- **Testing**: pytest conventions, fixtures, parameterized tests, mocking` : ""}

### 4. Architecture Layer Guidelines

Define coding standards for each architectural layer:

- **Presentation Layer**:
  - Controller/component structure and organization
  - Request/response handling patterns
  - Input validation and sanitization
  - DTO/ViewModel naming and structure
  - API endpoint design (RESTful principles, versioning)

- **Business Logic Layer**:
  - Service class structure and responsibilities
  - Business rule implementation patterns
  - Transaction boundary definitions
  - Domain model usage and manipulation
  - Orchestration and workflow patterns

- **Data Access Layer**:
  - Repository interface and implementation patterns
  - Entity/model definitions and relationships
  - Query construction and optimization guidelines
  - Connection management and pooling
  - Migration and schema versioning

- **Cross-Cutting Concerns**:
  - Logging standards (levels, structured logging, sensitive data)
  - Error handling and exception patterns
  - Authentication and authorization implementation
  - Validation rules and framework usage
  - Caching strategies and invalidation
  - Configuration management

### 5. Code Quality Standards

Establish measurable quality standards:
- **Code Formatting**: Indentation, line length, spacing, bracket placement
- **Comment Guidelines**: When to comment, inline vs block comments, documentation requirements
- **Complexity Limits**: Maximum method length, cyclomatic complexity thresholds
- **Code Review Checklist**: Key items reviewers should verify
- **Performance Considerations**: Memory management, query optimization, caching
- **Security Practices**: Input validation, authentication, authorization, data protection

${INCLUDE_CODE_EXAMPLES ? `### 6. Code Examples

For each major convention, provide clear, illustrative code examples showing:
- **Good Practice**: Correct implementation following the convention
- **Explanation**: Why this approach is recommended
- **Context**: When and where to apply this pattern
- **Common Variations**: Acceptable alternatives if applicable` : ""}

${INCLUDE_ANTIPATTERNS ? `### ${INCLUDE_CODE_EXAMPLES ? "7" : "6"}. Anti-Patterns to Avoid

Document common mistakes and discouraged practices:
- **Code Smells**: Specific patterns that indicate poor code quality
- **Performance Pitfalls**: Common mistakes that impact performance
- **Security Vulnerabilities**: Patterns that introduce security risks
- **Maintainability Issues**: Practices that make code harder to maintain
- **Incorrect Usage**: Misuse of frameworks, libraries, or language features

For each anti-pattern, explain why it's problematic and provide the correct alternative.` : ""}

${DETAIL_LEVEL == "Comprehensive" ? `### ${INCLUDE_CODE_EXAMPLES && INCLUDE_ANTIPATTERNS ? "8" : INCLUDE_CODE_EXAMPLES || INCLUDE_ANTIPATTERNS ? "7" : "6"}. Additional Guidelines

- **Version Control**: Commit message format, branch naming, pull request descriptions
- **Documentation**: README requirements, API documentation, inline documentation
- **Dependency Management**: Package selection criteria, version pinning, update strategies
- **Environment Configuration**: Local development setup, environment variables, secrets management
- **Tooling**: Linters, formatters, pre-commit hooks, IDE configuration` : ""}

### ${DETAIL_LEVEL == "Comprehensive" ? (INCLUDE_CODE_EXAMPLES && INCLUDE_ANTIPATTERNS ? "9" : INCLUDE_CODE_EXAMPLES || INCLUDE_ANTIPATTERNS ? "8" : "7") : (INCLUDE_CODE_EXAMPLES && INCLUDE_ANTIPATTERNS ? "8" : INCLUDE_CODE_EXAMPLES || INCLUDE_ANTIPATTERNS ? "7" : "6")}. Document Structure

Create `/docs/coding-convention.md` with the following structure:
1. **Introduction**: Purpose, scope, and importance of coding conventions
2. **Table of Contents**: Clear navigation to all sections
3. **Core Principles**: Foundation principles guiding all conventions
4. **Language-Specific Conventions**: Organized by ${ORGANIZATION}
5. **Architecture Guidelines**: Layer-specific standards
6. **Quality Standards**: Measurable criteria for code quality
${INCLUDE_CODE_EXAMPLES ? "7. **Code Examples**: Practical illustrations of conventions" : ""}
${INCLUDE_ANTIPATTERNS ? `${INCLUDE_CODE_EXAMPLES ? "8" : "7"}. **Anti-Patterns**: What to avoid and why` : ""}
${DETAIL_LEVEL == "Comprehensive" ? `${INCLUDE_CODE_EXAMPLES && INCLUDE_ANTIPATTERNS ? "9" : INCLUDE_CODE_EXAMPLES || INCLUDE_ANTIPATTERNS ? "8" : "7"}. **Additional Guidelines**: Supporting practices and tooling` : ""}
${INCLUDE_CODE_EXAMPLES && INCLUDE_ANTIPATTERNS ? (DETAIL_LEVEL == "Comprehensive" ? "10" : "9") : INCLUDE_CODE_EXAMPLES || INCLUDE_ANTIPATTERNS ? (DETAIL_LEVEL == "Comprehensive" ? "9" : "8") : (DETAIL_LEVEL == "Comprehensive" ? "8" : "7")}. **Conclusion**: Enforcement, evolution, and team adoption strategies

Ensure the document is:
- **Actionable**: Developers can immediately apply these conventions
- **Clear**: Each guideline is specific and unambiguous
- **Justified**: Explains the reasoning behind important conventions
- **Practical**: Aligned with the project's technical stack and architecture
- **Maintainable**: Easy to update as the project evolves
"

## Expected Output
Upon running this prompt, GitHub Copilot will generate a comprehensive `/docs/coding-conventions.md` file tailored to your project's technology stack and architectural decisions, providing clear standards and best practices for your development team to follow.
