# Backend Evaluation Structure Contract

This reference describes the backend evaluation structure contract.

Backend evaluation structures are auto-discovered from:

`Backend/modules/decisionPlugins/evaluations/structures/<structureKey>/index.js`

Each registered structure exposes:

- `key`
- `stage`
- `get`
- `save`
- `get` and `save` receive an `evaluationContext` that uses the canonical runtime shape

Representative example:

```js
const backendEvaluationStructureExample = {
  key: "alternativeCriteriaMatrix",
  stage: "alternativeEvaluation",
  get: "function getAlternativeCriteriaMatrixEvaluation(args)",
  save: "function saveAlternativeCriteriaMatrixEvaluation(args)"
};
```

`get` and `save` are functions. They are represented as strings above only because function values cannot be shown as JSON data.

Practical guidance:

- The folder name must match `key`.
- `stage` identifies the evaluation stage handled by the structure.
- `get` reads the saved evaluation payload for this structure.
- `save` validates and persists the submitted evaluation payload for this structure.
- Read ordered alternatives from `evaluationContext.alternatives`.
- Read ordered leaf criteria from `evaluationContext.leafCriteria`.
- Read full hierarchy from `evaluationContext.criteriaTree`.
- Read domain metadata from `criterion.expressionDomain`.
- Derive label arrays locally when the payload contract still needs names.
- The structure should not know about frontend internals.
- Structure-specific persistence and read logic stays isolated here.

Useful access examples:

```js
structure.key
structure.stage
structure.get
structure.save
```

The backend `evaluationContext` shape is:

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
