# Architecture and Runtime

## Backend structure

- `app.js`, `server.js`
- `database/`
- `routes/`
- `controllers/`
- `modules/`
- `models/`
- `middlewares/`
- `services/`
- `utils/common/`
- `openapi/`
- `docs/generated/`

## Request lifecycle

1. Route selects middleware stack.
2. Middleware resolves auth/validation/context.
3. Controller delegates to module/service logic.
4. Module executes domain rules and persistence operations.
5. Service handles integration I/O (ApiModels, email, tokens).
6. Controller returns a success envelope with `sendSuccess(...)`.
7. Failures are normalized and serialized by global error handling.

## Cross-layer rules

- Keep controllers orchestration-only.
- Keep issue-domain decisions inside modules.
- Keep integration and transport details inside services.
- Reuse common response/error utilities instead of ad-hoc payloads.

## Compatibility bridge

`mapParamsToBody` exists in route files to preserve compatibility with handlers that still read IDs from `req.body`.

## Generated docs exposure

- `GET /api/openapi.json` serves `Backend/openapi/openapi.json`.
- `GET /api/docs` serves `Backend/docs/generated/api-reference.html`.
- `GET /api/docs/jsdoc` serves static files from `Backend/docs/generated/jsdoc/`.
