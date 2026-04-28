# Database Models

## Primary collections

- `User`
- `IssueModel`
- `Issue`
- `Alternative`
- `Criterion`
- `Participation`
- `Evaluation`
- `CriteriaWeightEvaluation`
- `Consensus`
- `ExpressionDomain`
- `IssueExpressionDomain`
- `IssueScenario`
- `Notification`
- `ExitUserIssue`

## Issue (core aggregate)

Key fields include:

- ownership and identity: `admin`, `model`, `name`, `description`
- lifecycle: `active`, `currentStage`, `creationDate`, `closureDate`
- workflow config: `weightingMode`, `isConsensus`, `consensusMaxPhases`, `consensusThreshold`
- evaluation selection: `evaluationStructure`
- resolved model parameters: `modelParameters`
- stable ordering: `alternativeOrder`, `leafCriteriaOrder`

`evaluationStructure` is persisted with enum values `direct` or `pairwiseAlternatives`.

## IssueModel (catalog and governance)

Important groups of fields:

- technical sync fields: `apiModelKey`, `modelRole`, `modelStatus`, `supportsScenarios`, `apiEndpoint`, `manifestSync`
- capability fields: `evaluationStructure`, `isConsensus`, `isMultiCriteria`, `parameters`, `supportedDomains`
- editorial fields: `smallDescription`, `extendDescription`, `moreInfoUrl`
- admin visibility: `publicInIssueCatalog`

## Lifecycle-supporting documents

- `Participation`: invitation and completion state.
- `Evaluation`: per-cell evaluations with phase/history metadata.
- `CriteriaWeightEvaluation`: per-expert weights progression.
- `Consensus`: phase snapshots and collective outputs.
- `ExitUserIssue`: per-user hide/exit history.

## Key constraints and indexes

- `Participation`: unique `(issue, expert)`.
- `ExitUserIssue`: unique `(user, issue)`.
- `IssueExpressionDomain`: unique `(issue, sourceDomain)`.
- `ExpressionDomain`: unique private `(user, name)` and unique global `(isGlobal, name)` patterns.
