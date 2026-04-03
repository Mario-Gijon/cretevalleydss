# Backend architecture

## Overview

The backend of **Crete Valley DSS** is organized as a modular monolith.

Its purpose is to support the main decision-making workflows of the application, including:

- user authentication and account management
- issue creation and administration
- alternatives and criteria definition
- expert participation
- weight elicitation
- alternative evaluation
- consensus support
- issue resolution
- scenario execution
- notifications and administrative operations

The backend is part of a monorepo with three main applications:

- `Frontend`: React + MUI client application
- `Backend`: Node.js + Express API
- `ApiModels`: Python + FastAPI service for decision model execution

## Main stack

The backend is built with:

- **Node.js**
- **Express**
- **MongoDB**
- **Mongoose**
- **JWT** for authentication
- **HTTP cookies** for refresh token handling

## Architectural style

The backend follows a domain-oriented modular structure.

The codebase is organized so that HTTP concerns, domain logic, persistence and infrastructure concerns are separated into different areas of the project.

This structure helps keep the application understandable and maintainable while preserving a direct and practical codebase.

## Main backend responsibilities

The backend is responsible for:

- exposing the HTTP API used by the frontend
- authenticating users and protecting routes
- validating request data
- persisting and retrieving domain entities from MongoDB
- coordinating issue workflows
- managing expert participation and notifications
- interacting with the external model execution service
- serving the built frontend when needed

## Folder responsibilities

### `controllers/`

This folder contains the HTTP entry layer.

Controllers are responsible for:

- reading request data
- invoking domain logic
- preparing HTTP responses
- handling request/response orchestration

Controllers should focus on application input/output and avoid containing large business rules.

### `modules/`

This folder contains domain-specific application logic.

It groups the main use cases and workflows of the system by domain, such as:

- authentication flows
- issue creation and lifecycle logic
- administrative operations

This is where the main business behavior of the backend lives.

### `models/`

This folder contains the Mongoose models and schema-level behavior.

A model file typically includes:

- schema definition
- field structure
- indexes
- schema validators
- model hooks
- model methods

This folder describes how data is stored and which behaviors are directly tied to each model.

### `routes/`

This folder defines the HTTP routes exposed by the API.

Routes are responsible for:

- declaring endpoints
- applying middlewares
- connecting requests to controllers
- attaching OpenAPI documentation

### `middlewares/`

This folder contains reusable request-processing middleware, such as:

- authentication checks
- authorization checks
- refresh token validation
- request validation

These functions handle concerns shared across multiple routes.

### `services/`

This folder contains infrastructure-oriented services and integrations.

Typical responsibilities include:

- token generation
- email delivery
- communication with external systems

### `utils/common/`

This folder contains reusable cross-domain utility functions.

These utilities are generic helpers that do not belong exclusively to a single domain.

### `database/`

This folder contains the MongoDB connection logic.

It is responsible for configuring and establishing the Mongoose connection used by the backend.

## Application bootstrap

The backend startup is split into three main files:

### `app.js`

This file configures the Express application.

It is responsible for:

- creating the Express app
- registering common middleware
- configuring CORS
- mounting route modules
- handling API fallback behavior
- serving static frontend files when needed

### `database/db.js`

This file is responsible for establishing the MongoDB connection.

It exposes the database connection function used during server startup.

### `server.js`

This file is the runtime entrypoint of the backend.

It is responsible for:

- loading environment variables
- connecting to MongoDB
- starting the HTTP server

## API structure

The API is organized into the following main route domains:

### `/api/auth`

Authentication and account-related operations, such as:

- signup
- login
- logout
- token refresh
- current user profile
- profile updates
- account confirmation
- email change confirmation
- account deletion

### `/api/issues`

Core decision workflow operations, such as:

- issue creation
- issue listing
- issue detail retrieval
- expert management within issues
- notifications
- evaluations
- weights
- issue resolution
- issue scenarios
- finished issue management

### `/api/admin`

Administrative operations, such as:

- expert management
- issue inspection
- issue reassignment
- admin-side issue actions

## Authentication model

The backend uses JWT-based authentication with two token layers:

### Access token

The access token is sent in the `Authorization` header using the Bearer scheme.

It is used to authorize protected API requests.

### Refresh token

The refresh token is stored in an HTTP cookie.

It is used to generate new access tokens when the current one expires.

### Authorization

Role-based authorization is applied where needed.

Some routes require the authenticated user to have the `admin` role.

## Domain structure

The main functional domain of the backend is the **issue lifecycle**.

An issue represents a decision problem and acts as the central element around which the rest of the domain is organized.

An issue is associated with:

- an administrator
- a decision model
- alternatives
- a criteria tree
- experts
- evaluations
- weight inputs
- consensus phases when enabled
- final or intermediate scenario results

Other important supporting domains include:

- users
- expression domains
- notifications
- participation records
- exit/visibility records
- model definitions

## Persistence model

The backend uses MongoDB through Mongoose.

Persistence is modeled through multiple collections representing the main entities of the application, including:

- users
- issues
- issue models
- alternatives
- criteria
- participations
- evaluations
- criteria weight evaluations
- consensus records
- expression domains
- issue expression domain snapshots
- notifications
- issue scenarios
- exit user issue records

Detailed information about these collections is described in `data-model.md`.

## External integration

The backend communicates with the Python-based `ApiModels` service to execute decision models and related computations.

This external service is part of the overall platform but remains separated from the Node.js backend.

The backend is responsible for preparing and sending the required inputs and for handling the responses needed by the application workflows.

## Validation and error handling

Request validation is handled through middleware.

Authentication and authorization errors are also handled through middleware.

Controllers and domain modules may return domain-specific errors depending on the operation being performed.

OpenAPI documentation is used to describe the HTTP contract of the backend, while model JSDoc and markdown documentation describe persistence and architecture concerns.

## Static frontend serving

The backend can serve the built frontend application when required.

For non-API routes, the backend may delegate to the frontend SPA entrypoint so that client-side routing works correctly.

## Environment and runtime configuration

Runtime configuration is based on environment variables.

Typical configuration concerns include:

- MongoDB connection URI
- JWT secrets
- allowed frontend/backend origins
- server port
- external service URLs

Operational details should be documented in `deployment-and-env.md`.

## Code organization guidelines

When adding new code to the backend, the placement rule is:

- HTTP request/response logic belongs in `controllers/`
- domain workflows belong in `modules/`
- persistence definitions belong in `models/`
- infrastructure integrations belong in `services/`
- shared generic helpers belong in `utils/common/`
- route declarations belong in `routes/`
- cross-cutting request checks belong in `middlewares/`

## Summary

The backend architecture is centered on:

- a modular Express API
- domain-oriented application logic
- MongoDB persistence through Mongoose
- JWT-based authentication
- integration with an external model execution service
- clear separation between HTTP layer, domain logic, persistence and infrastructure

The purpose of this structure is to keep the backend understandable, maintainable and aligned with the functional needs of the project.