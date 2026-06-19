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
    alternatives: {
      names: ["Solar farm", "Wind farm"]
    },
    criteria: {
      leafNames: ["Cost", "Environmental impact"]
    },
    domains: {
      byCriterionName: {
        Cost: {
          type: "numeric",
          numericRange: {
            min: 0,
            max: 1,
            step: 0.1
          }
        },
        "Environmental impact": {
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
evaluationContext.alternatives.names
evaluationContext.criteria.leafNames
evaluationPayload["Solar farm"]["Cost"].value
collectivePayload["Wind farm"]["Environmental impact"].localizedLabel
readOnly
loading
```
