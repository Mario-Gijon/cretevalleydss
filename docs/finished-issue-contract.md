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

The frontend is intentionally not yet migrated to this contract.
