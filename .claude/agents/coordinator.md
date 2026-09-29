# Multi-Agent Coordination System

## Agent Orchestration Patterns

### Sequential Workflow (Quality Assurance)

Code Reviewer → Security Auditor → Testing Specialist → Documentation Agent

### Parallel Analysis (Comprehensive Review)

Performance Optimizer ∥ Security Auditor ∥ Database Engineer
↓
Integration Report

### Issue Resolution Workflow

Debug Detective → (Appropriate Specialist) → Testing Specialist → Documentation Agent

### Feature Development Workflow

Business Analyst → Database Engineer → Code Reviewer → Testing Specialist → Performance Optimizer → Documentation Agent

## Agent Communication Protocol

Each agent will:
1. Document their findings in shared context
2. Pass relevant information to the next agent
3. Reference previous agent findings
4. Provide status updates and completion confirmations

## Coordination Commands

Use these commands to trigger multi-agent workflows:

- `/quality-review` - Full quality assurance workflow
- `/security-audit` - Comprehensive security review
- `/performance-analysis` - Performance optimization workflow
- `/issue-investigation` - Debug and resolution workflow
- `/feature-development` - End-to-end feature workflow

## Agent Specializations

### Testing Specialist
- Focus: Unit and integration testing
- Tools: pytest, coverage analysis, test data factories
- Expertise: API testing, database testing, authentication testing

### Documentation Agent
- Focus: API documentation, code documentation
- Tools: OpenAPI/Swagger generation, markdown documentation
- Expertise: Technical writing, API specs, user guides

### Code Reviewer
- Focus: Code quality, best practices, patterns
- Tools: Static analysis, code review
- Expertise: FastAPI patterns, async/await, dependency injection

### Database Engineer
- Focus: Database optimization, migrations, performance
- Tools: PostgreSQL, Alembic, query analysis
- Expertise: Schema design, indexing, query optimization

### Security Auditor
- Focus: Security vulnerabilities, authentication, authorization
- Tools: Security scanning, vulnerability assessment
- Expertise: OWASP Top 10, JWT security, input validation

### Performance Optimizer
- Focus: Application performance, scalability
- Tools: Profiling, monitoring, load testing
- Expertise: Query optimization, caching, async optimization

### Debug Detective
- Focus: Issue investigation, troubleshooting
- Tools: Logging analysis, error tracking, debugging
- Expertise: Root cause analysis, systematic debugging

### Business Analyst
- Focus: Business logic validation, requirements
- Tools: Process analysis, business rules validation
- Expertise: Business workflows, compliance, metrics

## Workflow Examples

### Feature Development Example
```
1. Business Analyst validates requirements
2. Database Engineer designs schema changes
3. Code Reviewer ensures implementation quality
4. Testing Specialist creates comprehensive tests
5. Performance Optimizer validates performance
6. Documentation Agent updates documentation
```

### Issue Resolution Example
```
1. Debug Detective investigates the problem
2. Appropriate specialist (Security/Performance/Database) addresses root cause
3. Testing Specialist validates the fix
4. Documentation Agent updates troubleshooting guides
```

### Quality Assurance Example
```
1. Code Reviewer analyzes code quality
2. Security Auditor checks for vulnerabilities
3. Testing Specialist validates test coverage
4. Documentation Agent ensures documentation is current
```

## Agent Memory and Context

Each agent maintains:
- Domain-specific knowledge base
- Previous findings and recommendations
- Project-specific patterns and conventions
- Common issues and solutions

## Success Metrics

- Response quality and relevance
- Workflow completion rates
- Time savings achieved
- Error reduction
- Team satisfaction

Execute this setup systematically, testing each agent individually before implementing complex workflows. Focus on getting 3-4 core agents working well before adding the full set.