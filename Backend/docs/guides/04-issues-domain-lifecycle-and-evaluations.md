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

Alternative evaluations (`modules/issues/issue.evaluations.js`):

- draft save: direct and pairwise handlers,
- read payload: direct and pairwise handlers,
- submit flow: direct and pairwise handlers.

Weighting (`modules/issues/issue.weights.js`):

- manual and BWM draft/read/submit/compute flows,
- collective compute transitions issue stage to `alternativeEvaluation` when applicable.

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

## Current limitation

Pairwise resolution currently has a model-specific output adapter for Herrera-Viedma CRP. Adding another `pairwiseAlternatives` issue model requires adding a corresponding backend result adapter so the ApiModels response can be normalized and persisted safely.
