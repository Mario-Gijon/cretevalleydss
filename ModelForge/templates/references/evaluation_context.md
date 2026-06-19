# Frontend Evaluation Context

This reference describes the frontend `evaluationContext` object used by evaluation adapters and views.

The real runtime object currently contains more data than the example below. The example focuses on the fields commonly needed by generated templates. Shape may evolve, so if exact data beyond these fields is needed, capture a runtime snapshot before finalizing the generated template.

Treat the context as read-only. Use the structure-specific adapter and view contract instead of assuming hidden parent state.

Representative example:

```js
const evaluationContextExample = {
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
};
```

Useful access examples:

```js
evaluationContext.alternatives.names
evaluationContext.alternatives.names[0]
evaluationContext.criteria.leafNames
evaluationContext.criteria.leafNames[0]
evaluationContext.domains.byCriterionName
evaluationContext.domains.byCriterionName["Cost"]
evaluationContext.domains.byCriterionName[criterionName]
```

Practical guidance:

- `alternatives.names` is typically enough when a structure only needs ordered labels.
- `criteria.leafNames` is the most common criterion axis used by adapters and views.
- `domains.byCriterionName` lets a structure resolve numeric or linguistic domain metadata by criterion name.
- If a generated template needs `alternatives.items`, `criteria.leafItems`, `domains.byCriterionId`, `issue`, `model`, or `parameters`, that shape should be confirmed with a runtime snapshot before final template generation.
