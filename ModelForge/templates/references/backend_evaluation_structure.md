# Backend Evaluation Structure Contract

This reference describes the current backend evaluation structure expectations.

Backend evaluation structures are auto-discovered from:

`Backend/modules/decisionPlugins/evaluations/structures/<structureKey>/index.js`

Each registered structure exposes:

- `key`
- `stage`
- `get`
- `save`

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
- The structure should not know about frontend internals.
- Structure-specific persistence and read logic stays isolated here.

Useful access examples:

```js
structure.key
structure.stage
structure.get
structure.save
```

This reference should be expanded with exact `get` and `save` argument snapshots after capturing or inspecting the backend runtime call shape.
