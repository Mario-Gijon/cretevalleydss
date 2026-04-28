# Crete Valley DSS Backend Documentation

This documentation is maintained from the current backend implementation under `Backend/`.
Code remains the source of truth.

## Scope

These guides describe runtime architecture, API behavior, domain workflows, model governance, and maintenance constraints for:

- `app.js`, `server.js`, `database/`
- `routes/`, `controllers/`, `middlewares/`
- `modules/`, `services/`, `utils/common/`
- `models/`

## Guides

1. [01 Backend Overview](./guides/01-backend-overview.md)
2. [02 Architecture and Runtime](./guides/02-architecture-and-runtime.md)
3. [03 API Contract, Auth, and Errors](./guides/03-api-contract-auth-and-errors.md)
4. [04 Issues Domain, Lifecycle, and Evaluations](./guides/04-issues-domain-lifecycle-and-evaluations.md)
5. [05 Database Models](./guides/05-database-models.md)
6. [06 Model Catalog and ApiModels](./guides/06-model-catalog-and-apimodels.md)
7. [07 API Reference](./guides/07-api-reference.md)
8. [08 Development, Testing, and Maintenance](./guides/08-development-testing-and-maintenance.md)

## Generated artifacts

Generated assets are stored under `Backend/docs/generated/`.

When backend runtime is running, generated documentation is exposed at:

- `GET /api/docs` (Redoc HTML)
- `GET /api/docs/jsdoc` (JSDoc static site)
- `GET /api/openapi.json` (OpenAPI document)
