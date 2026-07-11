# Frontend Evaluation View Contract

This reference describes the props contract used by frontend evaluation views.

The example is representative and may vary by structure. Views should stay focused on UI state, local edits, and adapter-driven payload logic.
Expression-domain `definition` depends on `typeKey`. Do not assume `numericRange` or `linguisticLabels`.

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
          typeKey: "numericContinuous",
          definition: {
            min: 0,
            max: 1
          }
        }
      },
      {
        id: "CRIT_2",
        name: "Satisfaction",
        type: "benefit",
        expressionDomain: {
          id: "DOMAIN_2",
          name: "Ordered satisfaction scale",
          typeKey: "linguisticOrdinal",
          definition: {
            labels: [
              { key: "low", label: "Low", index: 0 },
              { key: "medium", label: "Medium", index: 1 },
              { key: "high", label: "High", index: 2 }
            ]
          }
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
    ALT_1: {
      CRIT_1: {
        value: 0.7
      },
      CRIT_2: {
        value: { labelKey: "medium" }
      }
    },
    ALT_2: {
      CRIT_1: {
        value: 0.4
      },
      CRIT_2: {
        value: { labelKey: "high" }
      }
    }
  },
  collectivePayload: {
    ALT_1: {
      CRIT_1: 0.65,
      CRIT_2: 1
    },
    ALT_2: {
      CRIT_1: 0.45,
      CRIT_2: 2
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
evaluationPayload.ALT_1.CRIT_1.value
collectivePayload.ALT_2.CRIT_1
readOnly
loading
```

Practical guidance:

- Derive ordered label arrays locally from `evaluationContext.alternatives` and `evaluationContext.leafCriteria`.
- Read domain metadata from `criterion.expressionDomain`.
- For `alternativeCriteriaMatrix`, keep editable cells exactly `{ value }` and keep domains only on criteria.
- Collective payload values are direct numbers or numeric arrays, not wrappers.
- Keep payload conversion and validation inside the structure adapter.
- Do not expect `evaluationContext.alternatives.names`, `evaluationContext.criteria.leafNames`, or separate domain maps.
