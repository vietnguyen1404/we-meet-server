---
description: 'Comprehensive project architecture blueprint generator for new projects. Creates detailed architectural documentation based on user requirements. Generates visual diagrams, documents implementation patterns, and provides extensible blueprints for guiding development and maintaining architectural consistency.'
agent: 'setup-greenfield'
---

# Scaffold Project Architecture Blueprint Generator

## Configuration Variables
${PROJECT_TYPE=".NET|Java|React|Angular|Python|Node.js|Flutter|Other"} <!-- Primary technology -->
${ARCHITECTURE_PATTERN="Clean Architecture|Microservices|Layered|MVVM|MVC|Hexagonal|Event-Driven|Serverless|Monolithic|Other"} <!-- Primary architectural pattern -->
${DIAGRAM_TYPE="C4|UML|Flow|Component|None"} <!-- Architecture diagram type -->
${DETAIL_LEVEL="High-level|Detailed|Comprehensive|Implementation-Ready"} <!-- Level of detail to include -->
${INCLUDES_CODE_EXAMPLES=true|false} <!-- Include sample code to illustrate patterns -->
${INCLUDES_IMPLEMENTATION_PATTERNS=true|false} <!-- Include detailed implementation patterns -->
${INCLUDES_DECISION_RECORDS=true|false} <!-- Include architectural decision records -->
${FOCUS_ON_EXTENSIBILITY=true|false} <!-- Emphasize extension points and patterns -->

## Generated Prompt

"Create a comprehensive architecture document at `/docs/architecture.md` that defines the architectural blueprint for a new ${PROJECT_TYPE} project. This document will serve as the definitive reference for implementing and maintaining architectural consistency throughout the project lifecycle. Use the following approach:

### 1. Project Requirements Gathering
Before proceeding, gather the following information from the user:

- **Project Overview**:
  - Project name and purpose
  - Key business objectives and requirements
  - Target users and usage patterns
  - Scalability and performance expectations

- **Technical Requirements**:
  ${PROJECT_TYPE != "Other" ? `- Confirm ${PROJECT_TYPE} as the primary technology stack
  - Specific frameworks and libraries to use` : "- Primary programming language(s) and frameworks
  - Technology preferences and constraints"}
  - Database requirements (relational, NoSQL, caching)
  - Integration requirements (third-party services, APIs)
  - Deployment environment (cloud provider, on-premises, hybrid)

- **Architectural Preferences**:
  ${ARCHITECTURE_PATTERN != "Other" ? `- Confirm ${ARCHITECTURE_PATTERN} as the architectural pattern
  - Any specific adaptations or variations needed` : "- Preferred architectural pattern and style
  - Reasons for choosing this pattern"}
  - Layer or component organization preferences
  - Separation of concerns strategy
  - Dependency management approach

- **Non-Functional Requirements**:
  - Security and compliance requirements
  - Performance and scalability targets
  - Availability and reliability expectations
  - Monitoring and observability needs

- **Team and Development Context**:
  - Team size and expertise
  - Development workflow preferences
  - Testing strategy and requirements
  - Documentation standards

### 2. Architectural Overview
Based on the gathered requirements, provide:

- A clear, concise explanation of the proposed architectural approach
- The guiding principles that will drive architectural decisions
- Architectural boundaries and how they will be enforced
- Rationale for choosing ${ARCHITECTURE_PATTERN} architecture
- How the architecture addresses the specific project requirements

### 3. Architecture Visualization
${DIAGRAM_TYPE != "None" ? `Create ${DIAGRAM_TYPE} diagrams at multiple levels of abstraction:
- High-level architectural overview showing major subsystems and their relationships
- Component interaction diagrams showing dependencies and communication flows
- Data flow diagrams showing how information moves through the system
- Use standard notation and ensure diagrams are clear and maintainable` : "Describe the component relationships with clear textual explanations of:
- Subsystem organization and boundaries
- Dependency directions and component interactions
- Data flow and process sequences"}

### 4. Core Architectural Components
Define each major architectural component for the new project:

- **Purpose and Responsibility**:
  - Primary function within the architecture
  - Business domains or technical concerns it addresses
  - Clear boundaries and scope limitations

- **Proposed Internal Structure**:
  - Organization of classes/modules within the component
  - Key abstractions to implement
  - Design patterns to utilize

- **Interaction Patterns**:
  - How the component will communicate with others
  - Interfaces to expose and consume
  - Dependency injection patterns to implement
  - Event publishing/subscription mechanisms if applicable

- **Extension Points**:
  - How the component can be extended in the future
  - Variation points and plugin mechanisms
  - Configuration and customization approaches

### 5. Architectural Layers and Dependencies
- Define the layer structure for the ${ARCHITECTURE_PATTERN} pattern
- Document the dependency rules between layers
- Specify abstraction mechanisms that enable layer separation
- Define guidelines to prevent circular dependencies and layer violations
- Document dependency injection patterns to maintain separation of concerns

### 6. Data Architecture
- Define domain model structure and organization strategy
- Plan entity relationships and aggregation patterns
- Specify data access patterns (repositories, data mappers, etc.)
- Document data transformation and mapping approaches
- Define caching strategies and where to implement them
- Document data validation patterns and placement

### 7. Cross-Cutting Concerns Implementation
Define implementation strategies for cross-cutting concerns:

- **Authentication & Authorization**:
  - Proposed security model and implementation approach
  - Permission enforcement patterns to implement
  - Identity management strategy
  - Security boundary patterns

- **Error Handling & Resilience**:
  - Exception handling patterns and conventions
  - Retry and circuit breaker implementation strategy
  - Fallback and graceful degradation approaches
  - Error reporting and monitoring strategy

- **Logging & Monitoring**:
  - Instrumentation patterns to implement
  - Observability strategy and tooling
  - Diagnostic information flow design
  - Performance monitoring approach

- **Validation**:
  - Input validation strategies and placement
  - Business rule validation implementation approach
  - Validation responsibility distribution across layers
  - Error reporting patterns

- **Configuration Management**:
  - Configuration source patterns and tooling
  - Environment-specific configuration strategies
  - Secret management approach and tools
  - Feature flag implementation strategy

### 8. Service Communication Patterns
- Define service boundary definitions and granularity
- Specify communication protocols and data formats
- Design synchronous vs. asynchronous communication patterns
- Document API versioning strategy
- Define service discovery mechanisms if applicable
- Specify resilience patterns for service communication

### 9. Technology-Specific Architectural Patterns
Document ${PROJECT_TYPE}-specific architectural patterns and best practices:

${PROJECT_TYPE == ".NET" ?
"#### .NET Architectural Patterns
- Host and application model implementation approach
- Middleware pipeline organization and custom middleware
- Framework service integration patterns (IServiceCollection)
- ORM selection and data access configuration (Entity Framework, Dapper)
- API implementation patterns (Controllers, Minimal APIs)
- Dependency injection container configuration and lifetimes
- Background service and hosted service patterns" : ""}

${PROJECT_TYPE == "Java" ?
"#### Java Architectural Patterns
- Application container and bootstrap process design
- Dependency injection framework selection and usage (Spring, CDI, Guice)
- AOP implementation patterns and use cases
- Transaction boundary management strategy
- ORM configuration and usage patterns (Hibernate, JPA)
- Service implementation patterns and annotations
- Resource management and connection pooling" : ""}

${PROJECT_TYPE == "React" ?
"#### React Architectural Patterns
- Component composition and reuse strategies
- State management architecture (Context, Redux, Zustand, etc.)
- Side effect handling patterns (useEffect, custom hooks)
- Routing and navigation approach (React Router)
- Data fetching and caching patterns (React Query, SWR, etc.)
- Rendering optimization strategies and performance patterns
- Form handling and validation approach" : ""}

${PROJECT_TYPE == "Angular" ?
"#### Angular Architectural Patterns
- Module organization strategy (standalone components vs. NgModules)
- Component hierarchy design and communication
- Service and dependency injection patterns
- State management approach (Services, NgRx, Akita)
- Reactive programming patterns (RxJS observables)
- Route guard implementation and navigation
- Form management (reactive vs. template-driven)" : ""}

${PROJECT_TYPE == "Python" ?
"#### Python Architectural Patterns
- Module organization approach and package structure
- Dependency management strategy (requirements, Poetry, pipenv)
- OOP vs. functional implementation patterns
- Framework integration patterns (Django, Flask, FastAPI)
- Asynchronous programming approach (asyncio, async/await)
- Type hinting and validation strategy (Pydantic)
- Testing framework selection and patterns" : ""}

${PROJECT_TYPE == "Node.js" ?
"#### Node.js Architectural Patterns
- Module organization and package structure
- Dependency injection approach (if any)
- Middleware patterns and request processing
- Asynchronous programming patterns (Promises, async/await)
- Error handling in async contexts
- Database client management and connection pooling
- API framework selection and patterns (Express, Fastify, NestJS)" : ""}

${PROJECT_TYPE == "Flutter" ?
"#### Flutter Architectural Patterns
- Widget composition and reuse strategies
- State management solution (Provider, Riverpod, BLoC, GetX)
- Navigation and routing approach
- API integration and data fetching patterns
- Local storage and caching strategy
- Platform-specific code organization
- Theme and styling management" : ""}

${PROJECT_TYPE == "Other" ?
"#### Technology-Specific Patterns
Based on the chosen technology stack, document:
- Framework-specific patterns and conventions
- Dependency management and injection approaches
- State management patterns
- Data access and persistence strategies
- API and service integration patterns
- Testing frameworks and approaches" : ""}

### 10. Implementation Patterns
${INCLUDES_IMPLEMENTATION_PATTERNS ?
"Provide concrete implementation pattern templates for key architectural components:

- **Interface Design Patterns**:
  - Interface segregation guidelines and examples
  - Abstraction level recommendations
  - Generic vs. specific interface patterns
  - Default implementation patterns

- **Service Implementation Patterns**:
  - Service lifetime management recommendations
  - Service composition patterns and guidelines
  - Operation implementation templates
  - Error handling patterns within services

- **Repository Implementation Patterns**:
  - Query pattern implementation templates
  - Transaction management guidelines
  - Concurrency handling strategies
  - Bulk operation patterns

- **Controller/API Implementation Patterns**:
  - Request handling pattern templates
  - Response formatting approaches and standards
  - Parameter validation strategies
  - API versioning implementation

- **Domain Model Implementation**:
  - Entity implementation patterns and base classes
  - Value object patterns and guidelines
  - Domain event implementation approach
  - Business rule enforcement strategies" : "Provide high-level guidance on implementation patterns aligned with the chosen architecture."}

### 11. Testing Architecture
- Define testing strategies aligned with the architecture
- Specify test boundary patterns (unit, integration, system, E2E)
- Recommend test doubles and mocking approaches
- Document test data strategies and management
- Specify testing tools and frameworks to integrate
- Define test organization and naming conventions

### 12. Deployment Architecture
- Define deployment topology for the target environment
- Specify environment-specific architectural considerations
- Plan runtime dependency resolution patterns
- Document configuration management across environments
- Define containerization and orchestration approach (Docker, Kubernetes)
- Specify cloud service integration patterns and services to use
- Document CI/CD pipeline considerations

### 13. Extension and Evolution Patterns
${FOCUS_ON_EXTENSIBILITY ?
"Provide detailed guidance for extending the architecture as the project grows:

- **Feature Addition Patterns**:
  - Guidelines for adding new features while preserving architectural integrity
  - Where to place new components by type and responsibility
  - Dependency introduction guidelines and restrictions
  - Configuration extension patterns

- **Modification Patterns**:
  - Guidelines for safely modifying existing components
  - Strategies for maintaining backward compatibility
  - Deprecation patterns and migration paths
  - Refactoring approaches within architectural constraints

- **Integration Patterns**:
  - Guidelines for integrating new external systems
  - Adapter implementation patterns and placement
  - Anti-corruption layer patterns for external dependencies
  - Service facade implementation guidelines" : "Define key extension points and guidelines for future architectural evolution."}

${INCLUDES_CODE_EXAMPLES ?
"### 14. Architectural Pattern Examples
Provide representative code examples that illustrate key architectural patterns:

- **Layer Separation Examples**:
  - Interface definition and implementation separation
  - Cross-layer communication patterns
  - Dependency injection configuration examples

- **Component Communication Examples**:
  - Service invocation patterns with sample code
  - Event publication and handling examples
  - Message passing implementation samples

- **Extension Point Examples**:
  - Plugin registration and discovery mechanisms
  - Extension interface implementation examples
  - Configuration-driven extension patterns

Include enough context with each example to demonstrate the pattern clearly, using ${PROJECT_TYPE} syntax and conventions. Keep examples concise and focused on architectural concepts rather than business logic." : ""}

${INCLUDES_DECISION_RECORDS ?
"### 15. Architectural Decision Records
Document key architectural decisions made during the planning phase:

- **Architectural Style Decisions**:
  - Why ${ARCHITECTURE_PATTERN} was chosen for this project
  - Alternatives considered and evaluation criteria
  - Constraints that influenced the decision

- **Technology Selection Decisions**:
  - Why ${PROJECT_TYPE} was selected as the primary technology
  - Framework and library selections with rationales
  - Custom vs. off-the-shelf component decisions

- **Implementation Approach Decisions**:
  - Specific implementation patterns chosen
  - Standard pattern adaptations for this project
  - Performance vs. maintainability tradeoffs

For each decision, document:
- Context that made the decision necessary
- Factors considered in making the decision
- Expected consequences (positive and negative)
- Future flexibility or limitations introduced" : ""}

### ${INCLUDES_DECISION_RECORDS ? "16" : INCLUDES_CODE_EXAMPLES ? "15" : "14"}. Architecture Governance
- Define how architectural consistency will be maintained
- Specify automated checks for architectural compliance
- Recommend code review focus areas for architecture
- Define architectural documentation maintenance practices
- Specify when architectural reviews are needed

### ${INCLUDES_DECISION_RECORDS ? "17" : INCLUDES_CODE_EXAMPLES ? "16" : "15"}. Blueprint for Development
Create a comprehensive architectural guide for implementing the project:

- **Development Workflow**:
  - Starting points for different feature types
  - Component creation sequence and checklist
  - Integration steps with the architectural framework
  - Testing approach by architectural layer

- **Implementation Templates**:
  - Base class/interface templates for key architectural components
  - Standard file organization and naming conventions
  - Dependency declaration patterns and examples
  - Required documentation for each component type

- **Common Pitfalls to Avoid**:
  - Architecture violations to watch for
  - Common mistakes when implementing patterns
  - Performance anti-patterns to avoid
  - Testing blind spots and gaps

- **Getting Started Guide**:
  - Initial project setup steps
  - First components to implement
  - Recommended implementation order
  - Verification steps to ensure correct setup

Include a note that this blueprint was generated on ${new Date().toLocaleDateString()} and should be updated as the architecture evolves and new patterns emerge during development."
