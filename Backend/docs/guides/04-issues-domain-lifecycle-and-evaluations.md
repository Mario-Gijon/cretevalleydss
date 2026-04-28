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

## Evaluation structure selection

Evaluation flow selection is based only on `evaluationStructure`:

- `direct`
- `pairwiseAlternatives`

No legacy boolean fallback is supported for flow selection.

## Evaluation, weighting, and resolution flows

Alternative evaluations are implemented under `modules/issues/alternativeEvaluations/`
with a single controller-facing service in
`modules/issues/alternativeEvaluations/alternativeEvaluation.service.js`.

Service public API:

- `getAlternativeEvaluations({ issueId, userId })`
- `saveAlternativeEvaluationDraft({ issueId, userId, body })`
- `submitAlternativeEvaluations({ issueId, userId, body })`

Alternative structure modules:

- constants: `alternativeEvaluation.constants.js`
- shared helpers: `alternativeEvaluation.shared.js`
- initial evaluation docs: `alternativeEvaluation.initialDocs.js`
- operations by structure:
  - `alternativeEvaluation.direct.js`
  - `alternativeEvaluation.pairwiseAlternatives.js`
- structure selection by `evaluationStructure` is internal to `alternativeEvaluation.service.js`.

Built-in alternative operations are:

- `read`
- `saveDraft`
- `submit`

Controller path:

- `saveEvaluations`, `getEvaluations`, `submitEvaluations`
  call the service and return the standard HTTP contract response.

Weight evaluations are implemented under `modules/issues/weightEvaluations/`
with a single controller-facing entrypoint in
`modules/issues/weightEvaluations/index.js`.

Service public API:

- `getManualWeightEvaluation({ issueId, userId })`
- `saveManualWeightDraft({ issueId, userId, body })`
- `submitManualWeights({ issueId, userId, body })`
- `computeManualWeights({ issueId, userId })`
- `getBwmWeightEvaluation({ issueId, userId })`
- `saveBwmWeightDraft({ issueId, userId, body })`
- `submitBwmWeights({ issueId, userId, body })`
- `computeBwmWeights({ issueId, userId })`

Weight structure modules:

- constants: `weightEvaluation.constants.js`
- family implementations:
  - `weightEvaluation.manual.js` (`manual`, `consensus`)
  - `weightEvaluation.bwm.js` (`bwm`, `consensusBwm`, `simulatedConsensusBwm`)
- family selection by `weightingMode` is handled by the route family and
  domain modules (`weightEvaluation.manual.js` and `weightEvaluation.bwm.js`).

Built-in weight operations are:

- `read`
- `saveDraft`
- `submit`
- `compute`

Current route families stay unchanged:

- `/weights/manual/*`
- `/weights/bwm/*`

Definitions:

- `saveDraft`: save partial expert input without final completion.
- `submit`: final expert submission that can update participation completion flags.
- `compute`: collective/admin operation that calculates final criteria weights
  and can advance the issue stage.

Resolution (`modules/issues/issue.resolution.js`):

- direct and pairwise resolution handlers,
- consensus phase persistence,
- round continuation or finalization,
- optional `forceFinalize` support.

## Expression domains and snapshots

- Reusable domains are stored in `ExpressionDomain`.
- Issue evaluations use immutable `IssueExpressionDomain` snapshots.
- Snapshot references are validated during evaluation saves.

## Expert and visibility flows

- `editIssueExpertsFlow`: add/remove experts in active issues.
- `leaveActiveIssueFlow`: participant exit in active issues.
- `hideFinishedIssueForUserFlow`: user-level hide of finished issues.
- `ExitUserIssue` stores hide/exit history with phase/stage context.
