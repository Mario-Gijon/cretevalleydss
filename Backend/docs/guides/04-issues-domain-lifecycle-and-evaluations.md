# Issues Domain, Lifecycle, and Evaluations

## Issue creation flow

`createIssueFlow` orchestrates:

- input normalization and validation,
- model/admin/expert loading,
- issue, alternatives, and criteria creation,
- canonical alternative and leaf-criteria ordering,
- participation creation and invitations,
- expression-domain assignment validation,
- `IssueExpressionDomain` snapshot creation,
- initial `Evaluation` and `CriteriaWeightEvaluation` creation.

## Lifecycle model

`Issue.currentStage` values:

- `criteriaWeighting`
- `weightsFinished`
- `alternativeEvaluation`
- `finished`

Initial stage is resolved by `resolveInitialIssueStage(...)` from weighting requirements.

Participation lifecycle:

- invitation status: `pending`, `accepted`, `declined`
- progress flags: `weightsCompleted`, `evaluationCompleted`

## Model contract dimensions used by issue resolution

The backend separates model behavior into independent concepts:

- `evaluationStructure`: how alternative evaluations are captured, validated, persisted, read, saved, and submitted.
- `inputKind`: request payload family expected by ApiModels.
- `outputKind`: normalized output family interpreted by backend application flows.
- `isConsensus`: whether the issue follows the consensus cycle.

These concepts are not aliases of each other.

Examples:

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

## Alternative evaluation flow (vertical slices)

Alternative evaluations are implemented under `modules/issues/alternativeEvaluations/` with:

- public entrypoint: `index.js`
- controller-facing orchestration: `alternativeEvaluation.service.js`
- structure registry: `alternativeEvaluation.registry.js`
- shared helpers: `alternativeEvaluation.shared.js`
- structure slices:
  - `direct/`
  - `pairwiseAlternatives/`

Service public API:

- `getAlternativeEvaluations({ issueId, userId })`
- `saveAlternativeEvaluationDraft({ issueId, userId, body })`
- `submitAlternativeEvaluations({ issueId, userId, body })`
- `buildInitialAlternativeEvaluationDocs(...)`

Each structure owns:

- `read`
- `saveDraft`
- `submit`
- `buildInitial`
- `buildResolutionInput`

Controller path:

- `saveEvaluations`, `getEvaluations`, `submitEvaluations` call the service and return the standard HTTP contract response.

## Weight evaluations

Weight evaluations are implemented under `modules/issues/weightEvaluations/` with a single controller-facing entrypoint in `modules/issues/weightEvaluations/index.js`.

Service public API:

- `getManualWeightEvaluation({ issueId, userId })`
- `saveManualWeightDraft({ issueId, userId, body })`
- `submitManualWeights({ issueId, userId, body })`
- `computeManualWeights({ issueId, userId })`
- `getBwmWeightEvaluation({ issueId, userId })`
- `saveBwmWeightDraft({ issueId, userId, body })`
- `submitBwmWeights({ issueId, userId, body })`
- `computeBwmWeights({ issueId, userId })`

## Resolution, normalized outputs, and raw model output

Resolution orchestration is implemented in `modules/issues/issue.resolution.js`:

- `resolveIssueFlow(...)` dispatches by `evaluationStructure`.
- `resolveDirectIssueFlow(...)` and `resolvePairwiseIssueFlow(...)` execute model calls and persist consensus artifacts.

Persistence model:

- backend keeps normalized fields for application workflows (ranking/scores/collective evaluations/consensus state),
- backend also persists full model-specific output at:
  - `Consensus.details.modelExecution.rawOutput`

`rawOutput` stores the unwrapped ApiModels payload (`data` after contract unwrapping). This preserves research fields (for example diagnostics, intervals, warnings, internal matrices, explanations) without requiring schema changes per metric.

## Expression domains and snapshots

- Reusable domains are stored in `ExpressionDomain`.
- Issue evaluations use immutable `IssueExpressionDomain` snapshots.
- Snapshot references are validated during evaluation saves.

## Expert and visibility flows

- `editIssueExpertsFlow`: add/remove experts in active issues.
- `leaveActiveIssueFlow`: participant exit in active issues.
- `hideFinishedIssueForUserFlow`: user-level hide of finished issues.
- `ExitUserIssue` stores hide/exit history with phase/stage context.
