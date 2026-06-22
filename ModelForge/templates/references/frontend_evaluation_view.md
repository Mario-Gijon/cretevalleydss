# Frontend Evaluation View Contract

This reference describes the props contract used by frontend evaluation views.

The example is representative and may vary by structure. Views should stay focused on UI state, local edits, and adapter-driven payload logic.

Frontend evaluation views receive:

- `evaluationContext`
- `evaluationPayload`
- `setEvaluationPayload`
- `collectivePayload`
- `readOnly`
- `loading`

Representative example:

```js
const evaluationViewPropsExample = {
  evaluationContext: {
    issue: {
      id: "ISSUE_1",
      name: "Energy Planning",
      currentStage: "alternativeEvaluation",
      consensusPhase: 1,
      isConsensus: false,
      consensusThreshold: null,
      consensusMaxPhases: null
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
    criteriaTree: [],
    leafCriteria: [
      {
        id: "CRIT_1",
        name: "Cost",
        type: "cost",
        expressionDomain: {
          id: "DOMAIN_1",
          name: "Cost scale",
          type: "numeric",
          numericRange: {
            min: 0,
            max: 1,
            step: 0.1
          },
          linguisticLabels: [],
          membershipFunction: null,
          valueCount: null,
          valuesMode: null
        }
      },
      {
        id: "CRIT_2",
        name: "Environmental impact",
        type: "benefit",
        expressionDomain: {
          id: "DOMAIN_2",
          name: "Impact labels",
          type: "linguistic",
          linguisticLabels: [
            {
              label: "Low",
              value: 0.2
            },
            {
              label: "Medium",
              value: 0.5
            },
            {
              label: "High",
              value: 0.8
            }
          ]
        }
      }
    ],
    consensus: {
      phase: 1,
      maxPhases: null,
      threshold: null,
      currentCollectiveEvaluations: {},
      previousCollectiveEvaluations: {}
    }
  },
  evaluationPayload: {
    "Solar farm": {
      Cost: {
        value: 0.7,
        domain: {
          type: "numeric",
          numericRange: {
            min: 0,
            max: 1,
            step: 0.1
          }
        }
      },
      "Environmental impact": {
        value: "Medium",
        domain: {
          type: "linguistic",
          linguisticLabels: [
            {
              label: "Low",
              value: 0.2
            },
            {
              label: "Medium",
              value: 0.5
            },
            {
              label: "High",
              value: 0.8
            }
          ]
        }
      }
    },
    "Wind farm": {
      Cost: {
        value: 0.4,
        domain: {
          type: "numeric",
          numericRange: {
            min: 0,
            max: 1,
            step: 0.1
          }
        }
      },
      "Environmental impact": {
        value: "High",
        domain: {
          type: "linguistic",
          linguisticLabels: [
            {
              label: "Low",
              value: 0.2
            },
            {
              label: "Medium",
              value: 0.5
            },
            {
              label: "High",
              value: 0.8
            }
          ]
        }
      }
    }
  },
  collectivePayload: {
    "Solar farm": {
      Cost: {
        value: 0.65
      },
      "Environmental impact": {
        localizedLabel: "Medium"
      }
    },
    "Wind farm": {
      Cost: {
        value: 0.45
      },
      "Environmental impact": {
        localizedLabel: "High"
      }
    }
  },
  readOnly: false,
  loading: false
};
```

`setEvaluationPayload(nextValueOrUpdater)` is also received by editable views but is not represented in the object example because it is a function.

Important notes:

- Some views may be wrapped in `forwardRef`.
- Views may expose `flushPendingEdits` or `preparePayloadRead` through `useImperativeHandle` when they manage pending grid or buffered input edits.
- Do not call Backend directly from the view.
- Use `setEvaluationPayload` to update state.
- Use the adapter for payload conversion and validation instead of moving random logic into parent components.

Useful access examples:

```js
evaluationContext.alternatives.map((alternative) => alternative.name)
evaluationContext.leafCriteria.map((criterion) => criterion.name)
evaluationContext.leafCriteria[0].expressionDomain
evaluationPayload["Solar farm"]["Cost"].value
collectivePayload["Wind farm"]["Environmental impact"].localizedLabel
readOnly
loading
```

Practical guidance:

- Derive ordered label arrays locally from `evaluationContext.alternatives` and `evaluationContext.leafCriteria`.
- Read domain metadata from `criterion.expressionDomain`.
- Keep payload conversion and validation inside the structure adapter.
- Do not expect `evaluationContext.alternatives.names`, `evaluationContext.criteria.leafNames`, or separate domain maps.
