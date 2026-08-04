# Backend Evaluation Structure Contract

This reference describes the backend evaluation structure contract.

Backend evaluation structures are auto-discovered from:

`Backend/modules/decisionPlugins/evaluations/structures/<structureKey>/index.js`

Each registered structure exposes:

- `key`
- `stage`
- `get`
- `save`
- optional `remapCriterionIds`
- `get` and `save` receive a `decisionContext` that uses the canonical runtime shape

Representative example:

```js
const backendEvaluationStructureExample = {
  key: "bestWorstCriteria",
  stage: "criteriaWeighting",
  get,
  save,
  remapCriterionIds,
};
```

Practical guidance:

- The folder name must match `key`.
- `stage` identifies the evaluation stage handled by the structure.
- `get` reads the saved evaluation payload for this structure.
- `save` validates and persists the submitted evaluation payload for this structure.
- `remapCriterionIds` is optional in the global registry. Creator-side API
  criteria weighting needs it when a payload is prepared before criteria are
  persisted.
- `remapCriterionIds` receives `{ payload, criterionIdMap }`, where
  `criterionIdMap` maps temporary criterion IDs to persisted criterion IDs. It
  must return the plugin-owned payload with temporary criterion references
  replaced by the persisted IDs. It must not mutate either input or use generic
  recursive string replacement.
- It may explicitly return `payload` unchanged only after confirming that the
  payload contains no criterion IDs.
- Read ordered alternatives from `decisionContext.alternatives`.
- Read ordered leaf criteria from `decisionContext.leafCriteria`.
- Read full hierarchy from `decisionContext.criteriaTree`.
- Read domain metadata from `criterion.expressionDomain` in `decisionContext`.
- For `alternativeCriteriaMatrix`, keep cells canonical as:

```js
{
  [alternativeId]: {
    [criterionId]: {
      value
    }
  }
}
```

- Do not read domains from cells.
- The structure should not know about frontend internals.
- Structure-specific persistence and read logic stays isolated here.

Useful access examples:

```js
structure.key
structure.stage
structure.get
structure.save
```

The backend `decisionContext` shape is:

```js
{
  issue,
  structure,
  model,
  modelParameters,
  criteriaWeightingParameters,
  alternatives,
  criteriaTree,
  leafCriteria,
  consensus
}
```

Do not expect `alternatives.names`, `criteria.leafNames`, `leafItems`, `byId`, `byName`, or separate domain maps.
