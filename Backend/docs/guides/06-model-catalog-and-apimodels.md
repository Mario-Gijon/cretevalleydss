# Model Catalog and ApiModels

## Ownership model

- ApiModels is the source of technical capabilities (`GET /models/manifest`).
- Backend Mongo (`IssueModel`) is the governance source for availability and editorial state.
- Frontend consumes backend APIs only.
- Admin controls catalog visibility through `publicInIssueCatalog`.

BWM and CMCC are auxiliary services and are not selectable issue models.

## Technical contract dimensions

Model integration uses independent dimensions:

- `evaluationStructure`: capture/persistence behavior for expert evaluations.
- `inputKind`: ApiModels request payload family expected by the model.
- `outputKind`: normalized result family interpreted by backend resolution flows.
- `isConsensus`: whether consensus-cycle behavior applies to the issue.

These dimensions are intentionally decoupled. The backend must not infer one dimension from another.

Reference examples:

- TOPSIS: `direct` + `directCrispMatrix` + `ranking` + non-consensus.
- Fuzzy TOPSIS: `direct` + `directFuzzyMatrix` + `ranking` + non-consensus.
- Herrera-Viedma CRP: `pairwiseAlternatives` + `pairwisePreferenceMatrix` + `consensusRanking` + consensus.
- Future direct consensus model: `direct` + `directCrispMatrix` + `consensusRanking` + consensus.

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

## Persisted model metadata used by resolution

`IssueModel` persists contract metadata consumed by backend resolution/scenario flows, including:

- `evaluationStructure`
- `inputKind`
- `outputKind`
- `criterionTypes` (canonical + aliases)
- `isConsensus`
- `isMultiCriteria`
- `supportsScenarios`
- `supportedDomains`
- `parameters`
- endpoint metadata (`apiEndpoint`)

## Normalized outputs and preserved raw outputs

For issue resolution, backend stores:

- normalized consensus details used by the application,
- full unwrapped ApiModels payload in:
  - `Consensus.details.modelExecution.rawOutput`

Rationale:

- research models can return fields beyond normalized ranking/consensus views,
- backend should preserve raw model-specific output without creating schema fields for every metric,
- dedicated adapters/UI should be added only when a field becomes part of application workflow.

## Intended frontend usage

- normal users: consume normalized ranking/scores/consensus information,
- expert users: may inspect a generic "Model-specific output" section that renders `rawOutput` as JSON.

Execution compatibility includes handling HTTP `200` with `success: false` as an operational error path.
