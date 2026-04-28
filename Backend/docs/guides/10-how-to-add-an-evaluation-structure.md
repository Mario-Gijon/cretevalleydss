# How to Add an Evaluation Structure

## 1. Overview

An evaluation structure defines how expert input is collected and represented before model execution.

- Decision model answers: how to compute.
- Evaluation structure answers: what experts provide and how it is stored/submitted.

In current code, alternative evaluation flow is selected by `evaluationStructure`.  
Criteria weighting flow is selected by `weightingMode`.

Adding a new structure is not automatic. It may require coordinated changes across:

- Frontend input UI and serializers,
- Backend validation and persistence,
- Backend model payload builders and output adapters,
- Finished issue rendering and scenario handling,
- ApiModels request schema and handlers (if payload changes).

## 2. Current alternative evaluation structures

Supported values:

- `direct`
- `pairwiseAlternatives`

Flow selection sources:

- Backend: `resolveEvaluationStructure(...)` in `Backend/modules/issues/issue.evaluationStructure.js`
- Alternative evaluation service:
  `Backend/modules/issues/alternativeEvaluations/alternativeEvaluation.service.js`
  via `getAlternativeEvaluations(...)`, `saveAlternativeEvaluationDraft(...)`,
  `submitAlternativeEvaluations(...)`
- Frontend resolver: `Frontend/src/features/issueAlternativeEvaluation/utils/evaluationStructure.js`

Operation semantics:

- `read`: returns current persisted draft/final payload for the expert.
- `saveDraft`: persists partial input without marking participation as completed.
- `submit`: validates final input and updates participation completion state.

### `direct` structure

Collection and storage:

- Initial docs: `buildInitialEvaluationDocs(...)` creates `Evaluation` rows with `comparedAlternative: null`.
- Draft/save/submit/read implementation: `saveDirectEvaluationDrafts(...)`,
  `getDirectEvaluationPayload(...)`, `submitDirectEvaluations(...)` in
  `Backend/modules/issues/alternativeEvaluations/alternativeEvaluation.direct.js`.
- Registration point: `Backend/modules/issues/alternativeEvaluations/alternativeEvaluation.direct.js`.
- Structure registration key: `direct` in
  `Backend/modules/issues/alternativeEvaluations/alternativeEvaluation.service.js`.
- Flow operations exposed by the direct module: `read`, `saveDraft`, `submit`.
- Submit validation: `validateFinalEvaluations(...)` in `issue.validation.js`.

Execution conversion:

- Resolver/scenario matrices: `buildScenarioDirectMatrices(...)` in `issue.scenarios.js`.
- Resolver: `resolveDirectIssueFlow(...)` in `issue.resolution.js`.

### `pairwiseAlternatives` structure

Collection and storage:

- Initial docs: `buildInitialEvaluationDocs(...)` with pairwise combinations (`alternative` + `comparedAlternative`).
- Draft/save/submit/read implementation: `savePairwiseEvaluationDrafts(...)`,
  `getPairwiseEvaluationPayload(...)`, `submitPairwiseEvaluations(...)` in
  `Backend/modules/issues/alternativeEvaluations/alternativeEvaluation.pairwiseAlternatives.js`.
- Registration point:
  `Backend/modules/issues/alternativeEvaluations/alternativeEvaluation.pairwiseAlternatives.js`.
- Structure registration key: `pairwiseAlternatives` in
  `Backend/modules/issues/alternativeEvaluations/alternativeEvaluation.service.js`.
- Flow operations exposed by the pairwise module: `read`, `saveDraft`, `submit`.
- Submit validation: `validateFinalPairwiseEvaluations(...)` in `issue.validation.js`.

Execution conversion:

- Resolver/scenario matrices: `buildScenarioPairwiseMatrices(...)` in `issue.scenarios.js`.
- Resolver: `resolvePairwiseIssueFlow(...)` in `issue.resolution.js`.

Current limitation:

- Pairwise output adaptation is specialized for `herrera_viedma_crp` in current resolver/scenario adapters.

## 3. Current weighting structures/modes

Weighting is currently controlled by `Issue.weightingMode` (not by `evaluationStructure`).

Defined `weightingMode` enum in `Backend/models/Issues.js`:

- `manual`
- `consensus`
- `bwm`
- `consensusBwm`
- `simulatedConsensusBwm`

Backend implementation:

- Initial weight docs:
  `buildInitialCriteriaWeightEvaluationDocs(...)` in
  `Backend/modules/issues/weightEvaluations/weightEvaluation.initialDocs.js`.
- Controller entrypoint:
  `Backend/modules/issues/weightEvaluations/index.js`
  via:
  - `getManualWeightEvaluation(...)`
  - `saveManualWeightDraft(...)`
  - `submitManualWeights(...)`
  - `computeManualWeights(...)`
  - `getBwmWeightEvaluation(...)`
  - `saveBwmWeightDraft(...)`
  - `submitBwmWeights(...)`
  - `computeBwmWeights(...)`
- Family implementations:
  - manual family: `weightEvaluation.manual.js` (`manual`, `consensus`)
  - BWM family: `weightEvaluation.bwm.js` (`bwm`, `consensusBwm`, `simulatedConsensusBwm`)
- Shared helpers:
  - `weightEvaluation.shared.js` (context loading, stage sync, shared normalizers)
- Weight operation semantics:
  - `read`: returns current persisted draft/final weight payload.
  - `saveDraft`: stores partial expert input.
  - `submit`: final expert submission that updates participation completion.
  - `compute`: collective/admin computation that can advance issue stage.
- Stage transitions:
  - issue creation stage selection: `resolveInitialIssueStage(...)`
  - completion sync: `syncIssueStageAfterWeightsCompletion(...)`
  - collective compute sets stage to `alternativeEvaluation`.

Routes:

- Manual:
  - `GET /api/issues/:id/weights/manual`
  - `POST /api/issues/:id/weights/manual/draft`
  - `POST /api/issues/:id/weights/manual/submit`
  - `POST /api/issues/:id/weights/manual/compute`
- BWM:
  - `GET /api/issues/:id/weights/bwm`
  - `POST /api/issues/:id/weights/bwm/draft`
  - `POST /api/issues/:id/weights/bwm/submit`
  - `POST /api/issues/:id/weights/bwm/compute`

Current limitation:

- Weighting variants `bwm`, `consensusBwm`, `simulatedConsensusBwm` currently share the same BWM data collection endpoints and core flow. To verify in code: consensus-specific differentiation for those variants before extending them.

## 4. Decision checklist before adding a structure

- Is this for alternatives or criteria weights?
- Is input per expert, per criterion, per alternative, or per cell?
- Is UI shape matrix/table/ranking/list/pairwise?
- Does it require numeric, linguistic, or mixed domains?
- Does it require per-cell validation rules?
- Does it need draft save + draft read + submit symmetry?
- Does it interact with consensus phases?
- Does it change issue stage transitions?
- Does it change ApiModels payload shape?
- Does it require new resolver output adapters?
- Does it affect scenarios?
- Does it affect finished issue rendering?

## 5. Backend changes for a new alternative evaluation structure

Review/change these files:

- `Backend/models/IssueModels.js`
  - `evaluationStructure` enum for model metadata.
- `Backend/models/Issues.js`
  - `evaluationStructure` enum persisted per issue.
- `Backend/modules/issues/alternativeEvaluations/alternativeEvaluation.constants.js`
  - add/confirm structure key.
- `Backend/modules/issues/alternativeEvaluations/alternativeEvaluation.service.js`
  - register structure flow operations in the internal structure map.
- `Backend/modules/issues/alternativeEvaluations/alternativeEvaluation.<structure>.js`
  - expose `read`, `saveDraft`, `submit`.
- `Backend/modules/issues/issue.evaluationStructure.js`
  - `resolveEvaluationStructure(...)` validation.
- `Backend/modules/issues/alternativeEvaluations/alternativeEvaluation.initialDocs.js`
  - initial `Evaluation` doc builder for direct/pairwise structures.
- `Backend/modules/issues/alternativeEvaluations/alternativeEvaluation.shared.js`
  - shared read/save context helpers (participation, snapshots, criteria/alternative maps).
- `Backend/modules/issues/issue.creation.js`
  - issue creation assignment and initial doc generation.
- `Backend/modules/issues/issue.validation.js`
  - final payload validation rules.
- `Backend/modules/issues/issue.scenarios.js`
  - matrix builders, payload generation, and output shaping.
- `Backend/modules/issues/issue.resolution.js`
  - ApiModels payload call + output adapter + consensus finalization logic.
- `Backend/modules/issues/issue.finished.js`
  - finished issue payload and available-model compatibility projection.

Also verify route/controller orchestration:

- `Backend/controllers/issue.controller.js` (`saveEvaluations`, `getEvaluations`, `submitEvaluations`, `resolveIssue`)
- `Backend/routes/issue.route.js`

## 6. Backend changes for a new criteria-weighting structure

Review/change these files:

- `Backend/models/Issues.js`
  - add/validate new `weightingMode` value.
- `Backend/modules/issues/weightEvaluations/weightEvaluation.constants.js`
  - add/confirm mode constant.
- `Backend/modules/issues/weightEvaluations/index.js`
  - export the controller-facing functions for manual and BWM families.
- `Backend/modules/issues/weightEvaluations/weightEvaluation.<mode-family>.js`
  - implement family-specific functions:
    `get*`, `save*Draft`, `submit*`, `compute*`.
- `Backend/modules/issues/weightEvaluations/weightEvaluation.initialDocs.js`
  - include weighting-mode decisions and initial `CriteriaWeightEvaluation` doc shape.
- `Backend/modules/issues/weightEvaluations/weightEvaluation.shared.js`
  - shared context and completion helpers.
- `Backend/modules/issues/issue.creation.js`
  - ensure creation stage and initial docs are correct.
- `Backend/modules/issues/issue.validation.js`
  - add final validation rules.
- `Backend/controllers/issue.controller.js` and `Backend/routes/issue.route.js`
  - expose flow through explicit endpoints if needed.

ApiModels integration:

- Only needed if weighting compute depends on external execution.
- Current example: `computeBwmWeights(...)` calls ApiModels `/bwm`.

Consensus interaction:

- Manual collective compute currently requires `weightingMode === "consensus"`.
- Other weighting modes may need explicit consensus semantics when extended.

## 7. Frontend changes

Practical Frontend touchpoints:

- Create Issue structure/mode selection:
  - `Frontend/src/features/createIssue/components/ModelParameters.jsx`
  - `Frontend/src/features/createIssue/hooks/useCreateIssueFlow.js`
- Alternative evaluation UI registry:
  - `Frontend/src/features/issueAlternativeEvaluation/registry/alternativeEvaluation.registry.js`
- Weighting UI registry:
  - `Frontend/src/features/issueWeightEvaluation/registry/weightEvaluation.registry.js`
- Draft/read/submit services:
  - `Frontend/src/features/issueWeightEvaluation/services/weightEvaluation.service.js`
  - `Frontend/src/services/issue.service.js`
- Finished issue rendering:
  - `Frontend/src/features/finishedIssueDialog/utils/finishedIssueRatings.ui.jsx`
  - `Frontend/src/features/finishedIssueDialog/hooks/useFinishedIssueDialogView.js`
  - `Frontend/src/features/finishedIssueDialog/utils/finishedIssueDialog.utils.js`

## 8. ApiModels changes

If the new structure changes model input shape:

- Update/add request schemas in `ApiModels/schemas/model_requests.py`.
- Update/add handlers in `ApiModels/services/model_handlers.py`.
- Register model route and response examples in `ApiModels/registry/model_registry.py`.
- Ensure manifest metadata declares correct `capabilities.evaluationStructure`.

If multiple models share the same new structure:

- Keep schema design reusable and stable, then expose structure capability consistently in manifest metadata.

## 9. Professional extension pattern

Current state:

- Frontend already uses registries for alternative evaluation and weighting dialogs.
- Backend now centralizes read/draft/submit (alternatives) through
  `alternativeEvaluation.service.js`, and read/draft/submit/compute (weights)
  through `weightEvaluations/index.js` with manual/BWM modules.

Recommended future refactor (not current behavior):

- Evaluation-structure registry (draft/read/submit operations),
- Payload-builder registry (Backend -> ApiModels),
- Validator registry,
- Result-adapter registry (ApiModels outputs -> persisted/Frontend payload),
- Frontend renderer registry (already partially implemented).

## 10. Example: adding `rankingAlternatives` (hypothetical)

Expected checklist:

1. Add enum value in `Issue` and `IssueModel` schemas.
2. Extend `EVALUATION_STRUCTURES` and resolver validation.
3. Add initial evaluation doc generation strategy.
4. Add draft/read/submit handlers and payload format in
   `alternativeEvaluation.<structure>.js`, then register the structure in
   `alternativeEvaluation.service.js`.
5. Add validation rules in `issue.validation.js`.
6. Add matrix/payload builder for resolution/scenarios in `issue.scenarios.js`.
7. Add resolver output adapter in `issue.resolution.js`.
8. Add finished issue renderer mapping in Frontend ratings UI registry.
9. Ensure ApiModels model request schema accepts ranking payload shape.
10. Add manual checks (and automated tests when available).

## 11. Example: adding `ahpCriteriaWeighting` (hypothetical)

Expected checklist:

1. Add new `weightingMode` enum value.
2. Add creation-time initial docs for AHP weighting data shape.
3. Add weight draft/read/submit endpoints and backend handlers.
4. Add AHP validation rules (matrix constraints, consistency inputs, etc.).
5. Add collective compute flow (local or ApiModels-backed).
6. Define lifecycle transition rule to `alternativeEvaluation`.
7. Add frontend weighting dialog and registry entry.
8. Update create-issue weighting selector and request serialization.
9. Validate finished issue and scenarios are unaffected or explicitly adapted.

## 12. Manual validation checklist

- Issue creation accepts the selected structure/mode.
- Initial evaluation/weight documents are created correctly.
- Draft save works.
- Draft read returns complete payload shape.
- Invalid payloads fail with clear structured errors.
- Submit marks participation progress correctly.
- Stage transitions are correct (`criteriaWeighting`/`weightsFinished`/`alternativeEvaluation`/`finished`).
- Resolution executes and persists expected artifacts.
- Consensus phase behavior works when enabled.
- Finished issue display renders structure-specific data.
- Scenario creation works (or fails with explicit limitations) when applicable.

## 13. Common mistakes

- Treating a new structure as only a frontend component.
- Forgetting persistence format and schema enums.
- Forgetting draft/read/submit symmetry.
- Forgetting lifecycle and participation state transitions.
- Forgetting consensus-phase behavior.
- Forgetting Backend model payload builder changes.
- Forgetting Backend output adapter and finished-issue rendering.
- Forgetting scenario compatibility.
- Forcing an incompatible structure into existing `direct`/`pairwiseAlternatives` adapters.
- Adding new structures/modes by scattering `if`/`switch` blocks instead of registering them in the service/family integration points first.
- Reintroducing legacy boolean flags for structure selection.
- Breaking the API contract (`success`, `message`, `data`, `error`) or returning `msg`/`results`.
