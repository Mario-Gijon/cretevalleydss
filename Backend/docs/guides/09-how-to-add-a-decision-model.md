# How to Add a Decision Model

## 1. Overview

Adding a model in Crete Valley DSS is a cross-application flow:

1. Implement and register the model in ApiModels.
2. Publish its metadata through ApiModels Model Manifest (`GET /models/manifest`).
3. Run Backend dry-run/sync to compare and persist model governance data in Mongo `IssueModel`.
4. Control public visibility from Backend Admin catalog (`publicInIssueCatalog`).
5. Frontend reads model catalog from Backend only (`GET /api/issues/models`).
6. Issue creation stores the selected model and its `evaluationStructure`.
7. Issue resolution calls ApiModels through Backend services and persists normalized outputs.

Main ownership:

- ApiModels publishes capabilities and executable endpoints.
- Backend governs availability and editorial metadata in `IssueModel`.
- Frontend never calls ApiModels directly for issue creation/resolution.

## 2. Decision checklist

Before adding anything, answer:

- Is this a selectable issue model (`issueModel`) or an auxiliary service?
- Is it a weighting service (`weightingService`)?
- Is it a utility/internal service (`utilityModel`)?
- Does it use an existing `evaluationStructure` (`direct` or `pairwiseAlternatives`)?
- Does it require a new `evaluationStructure`?
- Does it require consensus rounds?
- Does it support scenarios?
- What exact request payload does it need?
- What exact response `data` shape does it return?
- Can current Backend resolution mappers persist that output?
- Can current Frontend finished-issue UI render that output?

## 3. ApiModels changes (real files)

Current ApiModels implementation is registry-based:

- Model execution logic: `ApiModels/models/*` (existing handlers import files such as `models/topsis/topsis_model.py`, `models/herrera_viedma_crp/herrera_viedma_crp_model.py`).
- Request schemas and validation: `ApiModels/schemas/model_requests.py`.
- Execution handlers and contract responses: `ApiModels/services/model_handlers.py`.
- Route registry and manifest metadata: `ApiModels/registry/model_registry.py`.
- Runtime model endpoints from registry: `ApiModels/api/routers/models.py`.
- Manifest endpoint: `ApiModels/api/routers/model_manifest.py`.
- Manifest builder: `ApiModels/services/model_manifest_service.py`.
- Manifest schema: `ApiModels/schemas/model_manifest.py`.

Typical implementation sequence:

1. Add model algorithm implementation under `ApiModels/models/`.
2. Add request schema in `schemas/model_requests.py` (including `json_schema_extra` example).
3. Add handler in `services/model_handlers.py`.
4. Register route in `MODEL_REGISTRY` with response examples.
5. Add manifest metadata in `MODEL_MANIFEST_METADATA`.

Execution contract note:

- ApiModels handlers may return HTTP `200` with `success: false` for operational compatibility.
- Backend correctly treats that as an error via `unwrapModelApiResponse(...)` in `Backend/services/modelApi/modelResponse.js`.

## 4. Manifest metadata and roles

Manifest fields and Backend mapping:

- `key` -> `IssueModel.apiModelKey`
- `role` -> `IssueModel.modelRole`
- `status` -> `IssueModel.modelStatus`
- `publicInIssueCatalog` -> `IssueModel.publicInIssueCatalog` (local admin override preserved on existing models)
- `sync.safeToCreateIssueModel` -> sync creation gate
- `capabilities.evaluationStructure` -> `IssueModel.evaluationStructure`
- `capabilities.isConsensus` -> `IssueModel.isConsensus`
- `capabilities.isMultiCriteria` -> `IssueModel.isMultiCriteria`
- `capabilities.supportedDomains` -> `IssueModel.supportedDomains`
- `capabilities.supportsScenarios` -> `IssueModel.supportsScenarios`
- `parameters` -> `IssueModel.parameters`
- `endpoint` -> `IssueModel.apiEndpoint`

Role expectations:

- `issueModel`: selectable model for issue creation/resolution.
- `weightingService`: auxiliary weighting engine.
- `utilityModel`: auxiliary internal utility.

Important rule:

- BWM (`role=weightingService`) and CMCC (`role=utilityModel`) are auxiliary services and must not become selectable issue models unless intentionally redesigned as such.
- Set `publicInIssueCatalog: true` only for models that are truly ready for Create Issue and issue resolution/display flows.

## 5. Backend sync and catalog integration

Core Backend files:

- Manifest fetch/validation: `Backend/services/modelApi/modelManifestClient.js`
- Dry-run report (no writes): `Backend/services/modelApi/modelManifestDryRun.js`
- Sync writer: `Backend/services/modelApi/modelManifestSync.js`
- Admin controllers:
  - `getModelCatalogAdmin`
  - `getModelManifestDryRunAdmin`
  - `syncModelManifestAdmin`
  - `updateModelCatalogVisibilityAdmin`
  in `Backend/controllers/admin.controller.js`
- Admin routes in `Backend/routes/admin.route.js`:
  - `GET /api/admin/models/catalog`
  - `GET /api/admin/models/manifest/dry-run`
  - `POST /api/admin/models/manifest/sync`
  - `PATCH /api/admin/models/:id/catalog-visibility`

Governance rules enforced by current code:

- Dry-run is read-only.
- Sync requires `confirm: true`.
- Sync does not delete `IssueModel` documents.
- Sync can mark manifest-managed unmatched models as `stale`.
- Sync updates technical fields but does not overwrite editorial fields on existing models.
- Sync preserves local admin catalog visibility for existing models.
- Sync skips entries that are non-public, unsafe, or non-`issueModel` role.
- Sync does not create BWM/CMCC as `IssueModel`.

Current limitation:

- Model catalog orchestration is currently handled directly in controller + services; there is no dedicated `modules/admin/*` model-catalog flow module yet.

## 6. Backend issue-resolution integration

When no Backend change is needed:

- The model uses an existing structure (`direct` or `pairwiseAlternatives`).
- Existing payload builders already match model input requirements.
- Existing output adapters already map model `data` into consensus + finished issue payloads.

Key files:

- Resolution orchestration: `Backend/modules/issues/issue.resolution.js`
- Scenario simulation path: `Backend/modules/issues/issue.scenarios.js`
- Endpoint resolution: `Backend/services/modelApi/modelCatalog.js`
- Upstream response handling: `Backend/services/modelApi/modelResponse.js`

When Backend change is needed:

- New input payload shape (resolution/scenario call payload).
- New output shape (rankings, collective scores/evaluations, graphics, etc.).
- New consensus behavior.
- New scenario behavior or constraints.
- New `evaluationStructure`.

Current limitation:

- Pairwise resolution output adapter is specialized for `herrera_viedma_crp` in `resolvePairwiseIssueFlow(...)`.
- New pairwise models require explicit adapter work in:
  - `buildPairwiseResolutionArtifacts(...)` in `issue.resolution.js`
  - `buildScenarioOutputs(...)` in `issue.scenarios.js`

## 7. Frontend integration notes

Cross-app checklist (Frontend consumes Backend only):

- Create Issue model catalog:
  - `Frontend/src/services/issue.service.js` (`getModelsInfo`)
  - `Frontend/src/features/createIssue/steps/ModelStep.jsx`
- Admin model governance UI:
  - `Frontend/src/services/admin.service.js`
- Alternative evaluation UI compatibility by `evaluationStructure`:
  - `Frontend/src/features/issueAlternativeEvaluation/registry/alternativeEvaluation.registry.js`
- Finished issue ratings rendering:
  - `Frontend/src/features/finishedIssueDialog/utils/finishedIssueRatings.ui.jsx`
  - `Frontend/src/features/finishedIssueDialog/hooks/useFinishedIssueDialogView.js`
- Scenario UI and payload projection:
  - `Frontend/src/features/finishedIssueDialog/utils/finishedIssueDialog.utils.js`

## 8. Example path: adding a normal direct model

1. Implement model logic and request schema in ApiModels.
2. Add ApiModels handler and register route in `MODEL_REGISTRY`.
3. Add manifest metadata as:
   - `role: "issueModel"`
   - `publicInIssueCatalog: true`
   - `evaluationStructure: "direct"`
   - safe sync metadata enabled.
4. Verify ApiModels endpoint and `GET /models/manifest`.
5. Run Backend dry-run (`GET /api/admin/models/manifest/dry-run`).
6. Run Backend sync (`POST /api/admin/models/manifest/sync` with `confirm: true`).
7. Confirm `IssueModel` exists with expected metadata.
8. Confirm Admin visibility and Create Issue availability.
9. Resolve a real issue and verify finished issue payload/rendering.

If model returns the same output family used by current direct adapters (`collective_ranking`, `collective_scores`, `collective_matrix`, optional `plots_graphic`), resolution integration is usually straightforward.

## 9. Example path: adding a pairwise model

Setting `evaluationStructure: "pairwiseAlternatives"` is necessary but not sufficient.

You must also ensure:

- Backend can build correct pairwise execution payload (`buildScenarioPairwiseMatrices(...)` + resolver payload).
- Backend can normalize model output into persisted consensus/finished issue sections.
- Frontend pairwise finished-rating views can consume resulting payload.

Current limitation:

- `resolvePairwiseIssueFlow(...)` throws internal error for non-`herrera_viedma_crp` pairwise outputs.
- Add a model-specific or generic pairwise adapter before making the model public/selectable.

## 10. Manual validation checklist

- ApiModels endpoint executes with expected request/response.
- `GET /models/manifest` includes the new model with correct metadata.
- Backend dry-run reports expected match/create/update behavior.
- Sync creates/updates the correct `IssueModel`.
- Admin catalog shows expected metadata.
- Create Issue shows/hides model according to `publicInIssueCatalog`.
- Issue creation works with the model.
- Evaluation draft/read/submit flows work.
- Resolution works and persists expected consensus/output artifacts.
- Finished issue view renders ranking and evaluations correctly.
- Scenario creation and scenario detail work when `supportsScenarios` is true.

## 11. Common mistakes

- Marking an auxiliary service as selectable `issueModel`.
- Setting `publicInIssueCatalog: true` before Backend/Frontend can resolve/render outputs.
- Forgetting output adapter changes for new response shapes.
- Forgetting manifest metadata updates (`role`, `evaluationStructure`, `supportedDomains`, `sync`).
- Overwriting editorial fields during sync logic.
- Relying on legacy name matching instead of stable `apiModelKey` and `apiEndpoint`.
- Changing the HTTP response contract.
- Returning `msg` or `results` fields instead of the standard contract.
