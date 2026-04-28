# Model Catalog and ApiModels

## Ownership model

- ApiModels is the capabilities source (`GET /models/manifest`).
- Backend Mongo (`IssueModel`) is the governance source for availability and editorial state.
- Frontend consumes backend APIs only.
- Admin controls catalog visibility through `publicInIssueCatalog`.

BWM and CMCC are auxiliary services and are not selectable issue models.

## Public issue-model listing

`GET /api/issues/models` returns backend-governed models, filtering by fields such as visibility, role, and status.

## Admin model endpoints

- `GET /api/admin/models/catalog`
- `GET /api/admin/models/manifest/dry-run`
- `POST /api/admin/models/manifest/sync`
- `PATCH /api/admin/models/:id/catalog-visibility`

## Dry-run governance rules

Dry-run is read-only:

- fetches ApiModels manifest,
- compares with persisted `IssueModel` documents,
- returns a comparison report,
- performs no Mongo writes.

## Sync governance rules

Sync requires explicit confirmation and controlled writes:

- request body must include `confirm: true`,
- sync does not delete models,
- sync does not overwrite editorial fields on existing models,
- sync preserves local admin visibility decisions,
- sync does not create BWM/CMCC (or other non-`issueModel` roles) as selectable issue models,
- non-matched managed models can be marked `stale`.

## ApiModels execution integration

Main integration modules are in `services/modelApi/`:

- endpoint resolution (`modelCatalog.js`),
- manifest client / dry-run / sync,
- response normalization for model execution.

Execution compatibility includes handling HTTP `200` with `success: false` as an operational error path.
