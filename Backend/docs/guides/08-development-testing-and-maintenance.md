# Development, Testing, and Maintenance

## Prerequisites

- Node.js version compatible with backend dependencies.
- MongoDB instance.
- ApiModels service reachable by backend.

## Environment variables

Commonly used by current backend runtime and integrations:

- `URI_MONGODB`
- `PORT`
- `JWT_SECRET`
- `JWT_REFRESH`
- `ORIGIN_FRONT`
- `ORIGIN_BACK`
- `ORIGIN_APIMODELS`
- `ORIGIN_CRETEVALLEY`
- `ORIGIN_SULEIMAN`
- `APIKEY_BREVO`
- `OPENAPI_SERVER_URL` (optional)

## Run commands

From `Backend/`:

- `npm run dev`
- `npm start`

Documentation commands:

- `npm run docs:openapi`
- `npm run docs:openapi:lint`
- `npm run docs:openapi:bundle`
- `npm run docs:redoc`
- `npm run docs:jsdoc`
- `npm run docs:build`

## Manual testing checklists

Response contract:

1. Validate success envelope on successful routes.
2. Trigger validation/business/auth errors and confirm canonical error envelope.

Auth and authorization:

1. Signup, confirmation, login, and refresh paths.
2. Protected route access with valid and invalid tokens.
3. Admin route access with non-admin token.

Documentation endpoints:

1. Open `GET /api/docs` and confirm Redoc loads.
2. Open `GET /api/docs/jsdoc` and confirm JSDoc index and static assets load.
3. Fetch `GET /api/openapi.json` and confirm valid JSON is returned.

Issue lifecycle:

1. Create issue with criteria, alternatives, experts, and domain assignments.
2. Invitation response flow (`accepted` and `declined`).
3. Active issues projection (`issues`, `tasks`, `taskCenter`, `filtersMeta`).
4. Leave flow and exit history.
5. Active issue deletion cascade.

Evaluations, weights, and resolution:

1. Save and read evaluation drafts.
2. Submit invalid payloads and verify structured validation errors.
3. Manual and BWM weight draft/submit/compute flows.
4. Resolve issue and verify consensus artifacts.
5. Consensus continuation/finalization behavior, including `forceFinalize`.

Model manifest governance:

1. Verify `GET /api/admin/models/catalog` output.
2. Verify `PATCH /api/admin/models/:id/catalog-visibility` behavior.
3. Verify dry-run performs no writes.
4. Verify sync rejects missing `confirm: true`.
5. Verify confirmed sync keeps governance guarantees (no deletion, no editorial overwrite, no BWM/CMCC creation as IssueModel).

## Maintenance rules

- Keep controllers thin; keep business rules in modules.
- Keep integrations in services.
- Keep response and error envelopes consistent through shared utilities.
- Use only `evaluationStructure` for evaluation-flow selection.
- Keep `IssueExpressionDomain` snapshots as evaluation context for issue data.
- Apply manifest governance rules consistently.
- Update docs in the same change set as behavioral updates.

## Current limitations to track

- Fallback unknown `/api/*` 404 response is not fully normalized to the canonical error envelope.
- Email confirmation link paths in templates do not match current backend auth confirmation routes.
- Pairwise resolver output handling is specialized for `herrera_viedma_crp`.
- Legacy `jobs/autoCloseIssues.js` is not integrated with current controller exports/runtime startup.
- No automated backend test suite is currently present.
