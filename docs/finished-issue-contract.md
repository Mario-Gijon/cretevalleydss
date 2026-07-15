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

The frontend is intentionally not yet migrated to this contract.
