# Finished Issue backend contract

`GET /issues/finished/:id` returns contract version 1 only:

```text
issue, lifecycle, configuration, alternatives, criteria, expressionDomains,
participants, evaluations, phaseResults, consensus, models, scenarios,
executionMetadata
```

It is a factual, stable-ID-based JSON contract. Dates are ISO strings or
`null`; stored display dates (`creationDate`, `closureDate`) remain distinct
from technical timestamps. The endpoint does not return the former
presentation fields such as `summary`, `expertsRatings`, `modelParams`,
`consensusRounds`, or `analyticalGraphs`.

Key relationships:

- `criteria.nodes[].expressionDomainId` references `expressionDomains[].id`.
- `evaluations.individual[].contextId` references `evaluations.contexts[].id`.
- `evaluations.collective[].phaseResultId` references `phaseResults[].id`.
- `consensus.rounds[].phaseResultId` references `phaseResults[].id`; it does
  not duplicate results.
- `phaseResults[].expertWeightSnapshot` is historical execution evidence;
  `participants[].currentWeight` is mutable current participation state.

Individual evaluations retain both `rawPayload` (the persisted input) and
`displayPayload` (the registered structure transformation). Scenarios remain
separate execution records and are never merged into the base issue payload.
`executionMetadata.completeness.missingEvidence` contains machine-readable
codes for evidence that was never stored.

## Evaluation contexts

Each evaluation context has a stage and phase identity and carries a plain
`serializedContext` for the registered read-only structure:

```text
issue, structure, decisionModel, criteriaWeightingModel, activeModel,
modelParameters, criteriaWeightingParameters, alternatives, criteriaTree,
leafCriteria, consensus
```

`decisionModel` is always the issue decision model.
`criteriaWeightingModel` is the configured weighting model or `null`.
`activeModel` is the decision model for `alternativeEvaluation`, and the
configured weighting model (or `null`) for `criteriaWeighting`. There is no
ambiguous legacy `model` alias. Context previous collective values select the
greatest stored phase below the current phase within the **same stage**, so
sparse phases remain factual.

If a registered structure provides `get()` and it fails, Finished Issue loading
fails with an internal error containing only evaluation id, structure key,
stage, and phase metadata. It never silently substitutes a null display
payload. A null display payload is valid only if no `get()` exists or `get()`
explicitly returns null.

## Weighting provenance

`configuration.criteriaWeighting.source` describes the factual **process**:
`notRequired`, `directModelParameters`, `creatorCriteriaWeighting`,
`expertCriteriaWeighting`, or `unknown`. A completed individual
criteria-weighting evaluation establishes `expertCriteriaWeighting`; a model
or structure key alone establishes neither creator nor expert origin and is
therefore `unknown`.

`criteria.finalWeights.source` is separate. It describes the immediate stored
result used for final weights, including a criteria-weighting stage-result id,
stage, phase, and model id where applicable. Thus an expert process can
correctly have `expertCriteriaWeighting` as configuration source and
`criteriaWeightingStageResult` as final-weight source.

The frontend consumes this contract directly.

## Frontend consumption

The Finished Issue dialog keeps the response as one canonical `payload` and
selects an execution by `"base"` or a scenario id. Selecting a scenario never
merges it into, clones, or otherwise mutates the issue. Overview, Evaluations,
and Consensus always consume canonical issue data. Header model information,
Results Analysis, Models, and their dashboard previews may consume the selected
execution.

Base phase selection uses the stored numeric `phaseResults[].phase` values,
sorted by value; it never uses an array index. Scenarios expose their stored
source phase only as metadata and do not create synthetic rounds.

Evaluations use the registry renderer with `{ stage, structureKey,
evaluationContext, backendPayload, collectivePayload, readOnly: true }`.
`evaluationContext` is the serialized context referenced by the evaluation's
`contextId`; display payload is preferred over raw payload when present.

Opening or refreshing the dialog uses only `getFinishedIssueInfo(issueId)`.
The response supplies scenarios and compatible models, so scenario list/detail
reads are not part of Finished Issue. After a scenario is created or removed,
the dialog refetches this canonical payload.

## Frontend architecture

Each Finished Issue section owns a context-reading container, a pure builder,
and provider-free presentational components with section-local styles. Public
section indexes are the only shell entry points. Focused data, navigation, run,
and evaluation-selection hooks compose the dialog state.

Dashboard previews compose prepared section data: Overview, Evaluations, and
Consensus stay canonical, while Results Analysis and Models follow the selected
execution. A manual redesign should be confined to the target section's
`components/` and style file without changing its builder or dialog state.
