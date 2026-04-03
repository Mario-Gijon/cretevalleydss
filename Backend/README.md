# Crete Valley DSS Backend

Backend service for **Crete Valley DSS**, a decision support system focused on managing issues, alternatives, criteria, experts, and evaluations, with support for both consensus-based and non-consensus workflows.

This backend exposes the main API of the system and handles authentication, MongoDB persistence, and the core business logic related to issues, participations, evaluations, expression domains, and consensus processes.

## What this backend provides

This service is responsible for:

- user authentication
- account and profile management
- issue management
- alternative and criteria management
- expert assignment
- evaluation storage and processing
- support for consensus and non-consensus processes
- integration with auxiliary system services
- data persistence in MongoDB

## Main stack

- **Node.js**
- **Express**
- **MongoDB**
- **Mongoose**
- **JWT**
- **Cookies** for refresh token handling

## Relation to the rest of the project

This backend is part of a monorepo with three main blocks:

- **Frontend**: user interface built with React + MUI
- **Backend**: main API and business logic
- **ApiModels**: auxiliary Python/FastAPI service used for specific models or calculations

## Main structure

The backend is organized by responsibility:

```text
Backend/
├── controllers/     # HTTP layer
├── modules/         # Domain logic and use cases
├── models/          # Mongoose models and schema-related behavior
├── routes/          # Endpoints and OpenAPI documentation
├── middlewares/     # Authentication, authorization, and request validation
├── services/        # External integrations and infrastructure concerns
├── utils/           # Shared utilities
├── database/        # MongoDB connection
├── docs/            # Backend technical documentation
├── app.js           # Express application setup
├── server.js        # Server startup entry point
└── package.json
```

## Internal organization

The general architectural approach is:

- **controllers**: read the request, delegate the logic, and build the response
- **modules**: contain domain logic and use case orchestration
- **models**: define Mongoose schemas, validations, indexes, hooks, and model methods
- **middlewares**: apply authentication, authorization, and input validation
- **services**: encapsulate integrations and infrastructure-related logic
- **utils**: contain truly generic shared helpers

## Getting started

### 1. Install dependencies

Install the backend dependencies using the package manager configured in `package.json`.

Typical example:

```bash
npm install
```

### 2. Configure environment variables

Create the appropriate environment file for your local setup and define, at minimum, the configuration required for:

- server port
- MongoDB connection
- JWT secrets
- cookies / refresh token handling
- allowed frontend origin for CORS
- external services, if applicable

### 3. Start the backend

Run the startup script defined in `package.json`.

Typical examples:

```bash
npm run dev
```

or

```bash
npm start
```

> Check the actual scripts in `package.json` and use the one that matches your local setup.

## Documentation

The backend technical documentation is available in the [`docs/`](./docs) directory.

Main documents:

- [`docs/README.md`](./docs/README.md): documentation index
- [`docs/architecture.md`](./docs/architecture.md): backend architecture overview
- [`docs/data-model.md`](./docs/data-model.md): main data model and relationships
