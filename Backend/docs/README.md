# Backend documentation

This folder contains the technical documentation for the backend of **Crete Valley DSS**.

Its purpose is to provide a clear and maintainable reference for the structure, behavior and operation of the backend.

The documentation in this folder complements the codebase and the OpenAPI specification by describing the system from an architectural, domain and operational point of view.

## Documentation index

### `architecture.md`

Describes the backend architecture at a high level.

It explains:

- the role of the backend within the monorepo
- the main technical stack
- the architectural style
- the responsibility of the main folders
- the application bootstrap structure
- the main route domains
- the authentication model
- the relationship between HTTP layer, domain logic, persistence and infrastructure

This document is the best starting point for understanding how the backend is organized.

### `data-model.md`

Describes the persistence model of the backend.

It explains:

- the main MongoDB collections
- the purpose of each model
- the relationships between entities
- key fields and invariants
- domain notes associated with the stored data

This document is the reference for understanding how backend data is represented and persisted.

### `issue-lifecycle.md`

Describes the functional lifecycle of an issue.

It covers the main workflow of the application, including:

- issue creation
- alternatives and criteria definition
- expert assignment
- weight input
- alternative evaluation
- consensus-related flow
- issue resolution
- scenarios and related outputs

This document is useful for understanding the core business process of the platform.

### `api-overview.md`

Provides a functional overview of the backend API.

It describes:

- the main API domains
- the structure of the route groups
- how authentication is applied
- how the API is consumed by the frontend
- how OpenAPI documentation fits into the backend documentation

This document is intended as a guide to the public API surface of the backend.

### `error-handling.md`

Describes how the backend reports validation, authentication, authorization and runtime errors.

It includes:

- common response formats
- validation error behavior
- authentication and authorization failures
- common API error conventions

This document is useful when integrating frontend logic with backend responses.

### `deployment-and-env.md`

Describes runtime and deployment-related configuration.

It includes:

- required environment variables
- server bootstrap information
- database connection requirements
- local development considerations
- deployment-related notes

This document is useful when running or deploying the backend.

## Relationship with OpenAPI

The backend also includes OpenAPI documentation in the route layer.

OpenAPI is used to describe the HTTP contract of the API, including:

- endpoints
- parameters
- request bodies
- responses
- authentication requirements

The markdown documentation in `docs/` serves a different purpose.

It explains the backend as a system:

- how it is organized
- how its domains are structured
- how persistence is modeled
- how the main workflows operate

Both types of documentation are complementary.

## Suggested reading order

For someone new to the backend, the recommended reading order is:

1. `architecture.md`
2. `data-model.md`
3. `issue-lifecycle.md`
4. `api-overview.md`
5. OpenAPI documentation
6. `deployment-and-env.md`

## Backend scope

The backend is responsible for:

- exposing the HTTP API used by the frontend
- authenticating and authorizing users
- coordinating the decision-making workflow
- storing and retrieving domain data
- managing issue lifecycle operations
- handling expert participation and notifications
- interacting with the external model execution service
- serving the built frontend application when needed

## Main backend areas

The backend is organized around these main areas:

- `controllers/`: HTTP request and response handling
- `modules/`: domain-specific application logic
- `models/`: persistence definitions and model-specific behavior
- `routes/`: endpoint definitions and OpenAPI annotations
- `middlewares/`: authentication, authorization and validation middleware
- `services/`: external integrations and infrastructure concerns
- `utils/common/`: shared generic helpers
- `database/`: MongoDB connection logic

## Documentation principles

The documentation in this folder follows these principles:

- describe the current system as it is
- explain responsibilities clearly
- keep architectural and domain language explicit
- avoid relying only on implicit knowledge from the codebase
- complement, not replace, the code and OpenAPI documentation

## Maintenance note

When the backend behavior, structure or domain model changes, the corresponding document should be updated so that the documentation remains aligned with the implementation.