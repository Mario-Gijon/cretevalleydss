# Backend documentation setup

This folder contains the files needed to add a documentation pipeline to the backend:

- `jsdoc.json`: JSDoc configuration for internal code reference.
- `redocly.yaml`: Redocly CLI configuration for OpenAPI linting.
- `scripts/generate-openapi.mjs`: generates `openapi/openapi.json` from route annotations.
- `docs/jsdoc-home.md`: landing page for generated JSDoc output.
- `package.json.updated.example.json`: example of the updated package file with scripts and dependencies.
- `app.js.swagger.example.js`: example app integration with Swagger UI and the raw OpenAPI JSON endpoint.

## Suggested integration order

1. Merge the dependency and script changes from `package.json.updated.example.json` into your real `package.json`.
2. Copy `jsdoc.json` to the backend root.
3. Copy `redocly.yaml` to the backend root.
4. Copy `scripts/generate-openapi.mjs` into `Backend/scripts/`.
5. Copy `docs/jsdoc-home.md` into `Backend/docs/`.
6. Merge the Swagger UI changes from `app.js.swagger.example.js` into your real `app.js`.
7. Install dependencies.
8. Run:
   - `npm run docs:openapi`
   - `npm run docs:openapi:lint`
   - `npm run docs:redoc`
   - `npm run docs:jsdoc`
   - `npm run docs:build`
