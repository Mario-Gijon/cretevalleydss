# How to Add a Decision Model

## 1. Overview

Adding a model in Crete Valley DSS is a cross-application flow:

1. Implement and register the model in ApiModels.
2. Publish metadata through ApiModels Model Manifest (`GET /models/manifest`).
3. Run Backend dry-run/sync to compare and persist model governance data in Mongo `IssueModel`.
4. Control public visibility from Backend Admin catalog (`publicInIssueCatalog`).
5. Frontend reads model catalog from Backend only (`GET /api/issues/models`).
6. Issue creation stores selected model metadata in the issue lifecycle.
7. Issue resolution calls ApiModels and persists normalized + raw outputs.

Main ownership:

- ApiModels publishes executable capabilities and technical contract metadata.
- Backend governs availability/editorial state and runtime persistence.
- Frontend does not call ApiModels directly for issue creation/resolution.

## 2. Model contract dimensions (must stay decoupled)

A decision model is described by independent dimensions:

- `evaluationStructure`: how evaluations are captured/persisted (`direct`, `pairwiseAlternatives`, future values).
- `inputKind`: ApiModels request payload family (`directCrispMatrix`, `directFuzzyMatrix`, `pairwisePreferenceMatrix`, etc.).
- `outputKind`: normalized output family used by backend application flows (`ranking`, `consensusRanking`, etc.).
- `isConsensus`: whether issue resolution follows consensus rounds.

Do not hardcode assumptions such as:

- `direct` implies non-consensus,
- `pairwiseAlternatives` implies consensus,
- one `evaluationStructure` implies one `outputKind`.

## 3. Decision checklist

Before adding anything, answer:

- Is this a selectable issue model (`issueModel`) or an auxiliary service?
- Can it reuse an existing `evaluationStructure`?
- Does it require a new `inputKind` adapter?
- Does it require a new `outputKind` adapter?
- Is consensus enabled (`isConsensus`) for this model behavior?
- Does it support scenarios?
- Which fields are required by normalized application workflows?
- Which additional fields are research-specific and should remain in raw output only?

## 4. ApiModels changes (real files)

Current ApiModels implementation is registry-based:

- model logic: `ApiModels/models/*`
- request schemas: `ApiModels/schemas/model_requests.py`
- execution handlers: `ApiModels/services/model_handlers.py`
- route registry + manifest metadata: `ApiModels/registry/model_registry.py`
- runtime model routes: `ApiModels/api/routers/models.py`
- manifest endpoint: `ApiModels/api/routers/model_manifest.py`
- manifest builder/schema:
  - `ApiModels/services/model_manifest_service.py`
  - `ApiModels/schemas/model_manifest.py`

Typical sequence:

1. Add algorithm implementation.
2. Add/adjust request schema.
3. Add/adjust handler.
4. Register route in `MODEL_REGISTRY`.
5. Add metadata in `MODEL_MANIFEST_METADATA`.

## 5. Manifest metadata and Backend mapping

Key mapping into `IssueModel` includes:

- identity/governance: `key`, `role`, `status`, `publicInIssueCatalog`
- execution metadata: `endpoint`
- capabilities:
  - `evaluationStructure`
  - `inputKind`
  - `outputKind`
  - `supportsScenarios`
  - `isConsensus`
  - `isMultiCriteria`
  - `supportedDomains`
- `criterionTypes`
- `parameters`

Admin-preserved fields on existing models remain editorial:

- `smallDescription`
- `extendDescription`
- `moreInfoUrl`

## 6. Backend sync and catalog integration

Core Backend files:

- manifest client: `Backend/services/modelApi/modelManifestClient.js`
- dry-run report: `Backend/services/modelApi/modelManifestDryRun.js`
- sync writer: `Backend/services/modelApi/modelManifestSync.js`
- admin endpoints: `Backend/controllers/admin.controller.js` + `Backend/routes/admin.route.js`

Governance rules:

- dry-run is read-only,
- sync requires `confirm: true`,
- sync does not delete models,
- sync does not overwrite editorial fields,
- sync preserves local admin visibility on existing models,
- sync excludes non-`issueModel` entries from selectable model creation (for example BWM/CMCC).

## 7. Backend resolution integration and raw output persistence

Resolution orchestration is in `Backend/modules/issues/issue.resolution.js`.

Backend should:

- normalize common fields required by the app,
- persist full unwrapped ApiModels payload in:
  - `Consensus.details.modelExecution.rawOutput`

This supports research models that return extra fields (for example diagnostics, intervals, warnings, internal matrices, explanations) without introducing database fields per metric.

Add dedicated adapters/UI only when a field becomes part of application workflow.

## 8. Reuse-first extension rules

When adding a model:

- Do not create a new `evaluationStructure` unless capture/persistence behavior is actually different.
- Reuse existing `evaluationStructure` when expert-input shape is the same.
- Add/reuse `inputKind` adapters when ApiModels payload family differs.
- Add/reuse `outputKind` adapters when normalized application output family differs.
- Preserve additional model-specific fields in `rawOutput`.
- Introduce model-specific adapters only when generic `inputKind`/`outputKind` adapters are insufficient.

## 9. Reference examples

- TOPSIS:
  - `evaluationStructure`: `direct`
  - `inputKind`: `directCrispMatrix`
  - `outputKind`: `ranking`
  - `isConsensus`: `false`

- Fuzzy TOPSIS:
  - `evaluationStructure`: `direct`
  - `inputKind`: `directFuzzyMatrix`
  - `outputKind`: `ranking`
  - `isConsensus`: `false`

- Herrera-Viedma CRP:
  - `evaluationStructure`: `pairwiseAlternatives`
  - `inputKind`: `pairwisePreferenceMatrix`
  - `outputKind`: `consensusRanking`
  - `isConsensus`: `true`

- Future direct consensus model:
  - `evaluationStructure`: `direct`
  - `inputKind`: `directCrispMatrix`
  - `outputKind`: `consensusRanking`
  - `isConsensus`: `true`

## 10. Frontend note (no implementation in this guide)

Intended behavior:

- normal users consume normalized ranking/scores/consensus sections,
- expert users may inspect a generic "Model-specific output" section that renders `rawOutput` as JSON.

## 11. Manual validation checklist

- ApiModels endpoint executes with expected request/response.
- `GET /models/manifest` includes expected metadata.
- Backend dry-run reports expected match/create/update behavior.
- Backend sync persists expected `IssueModel` metadata.
- Admin visibility behaves as expected.
- Create Issue shows/hides model according to backend catalog state.
- Resolution persists normalized outputs and `modelExecution.rawOutput`.
- Finished issue payload remains compatible with existing frontend flows.

## 12. Common mistakes

- Creating a new `evaluationStructure` for model-specific metrics only.
- Coupling consensus behavior to `evaluationStructure`.
- Assuming `outputKind` includes every research field.
- Dropping raw model-specific fields instead of preserving them in `rawOutput`.
- Publishing a model before backend adapters can normalize required workflow fields.
