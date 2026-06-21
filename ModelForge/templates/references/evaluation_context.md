# Frontend Evaluation Context

This reference describes the frontend `evaluationContext` contract used by evaluation adapters and views.

Treat `evaluationContext` as read-only. IDs are canonical. Names are display labels only.

Representative example:

```js
const evaluationContextExample = {
  issue: {
    id: "ISSUE_1",
    name: "Energy Planning",
    currentStage: "alternativeEvaluation",
    consensusPhase: 1,
    isConsensus: true,
    consensusThreshold: 0.8,
    consensusMaxPhases: 3
  },
  structure: {
    key: "alternativeCriteriaMatrix",
    stage: "alternativeEvaluation"
  },
  model: {
    id: "MODEL_1",
    name: "TOPSIS",
    apiModelKey: "topsis"
  },
  modelParameters: {
    beta: 0.8
  },
  criteriaWeightingParameters: {},
  alternatives: [
    {
      id: "ALT_1",
      name: "Solar farm"
    },
    {
      id: "ALT_2",
      name: "Wind farm"
    }
  ],
  criteriaTree: [
    {
      id: "CRIT_GROUP_1",
      name: "Sustainability",
      type: "benefit",
      expressionDomain: null,
      children: [
        {
          id: "CRIT_1",
          name: "Cost",
          type: "cost",
          expressionDomain: {
            id: "DOMAIN_1",
            name: "Cost scale",
            type: "numericContinuous",
            numericRange: {
              min: 0,
              max: 1,
              step: 0.1
            }
          },
          children: []
        }
      ]
    }
  ],
  leafCriteria: [
    {
      id: "CRIT_1",
      name: "Cost",
      type: "cost",
      expressionDomain: {
        id: "DOMAIN_1",
        name: "Cost scale",
        type: "numericContinuous",
        numericRange: {
          min: 0,
          max: 1,
          step: 0.1
        }
      }
    }
  ],
  consensus: {
    phase: 1,
    maxPhases: 3,
    threshold: 0.8,
    currentCollectiveEvaluations: {},
    previousCollectiveEvaluations: {}
  }
};
```

Useful access examples:

```js
evaluationContext.alternatives.map((alternative) => alternative.name)
evaluationContext.leafCriteria.map((criterion) => criterion.name)
evaluationContext.leafCriteria[0].id
evaluationContext.leafCriteria[0].expressionDomain
evaluationContext.criteriaTree[0].children
evaluationContext.modelParameters
```

Practical guidance:

- Use `evaluationContext.alternatives` for ordered alternatives.
- Use `evaluationContext.criteriaTree` for the full ordered tree.
- Use `evaluationContext.leafCriteria` for ordered leaf criteria.
- Read domain metadata from `criterion.expressionDomain`.
- Derive name arrays locally when a structure or view needs them.
- Do not expect `alternatives.names`, `criteria.leafNames`, `byId`, `byName`, or separate domain maps.
