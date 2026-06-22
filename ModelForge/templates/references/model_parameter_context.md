# Frontend Model Parameter Context

This reference describes the frontend `parameterContext` object passed to model parameter components.

Treat `parameterContext` as read-only. Do not access MongoDB. Do not depend on raw issue documents.

Representative example:

```js
const parameterContextExample = {
  model: {
    id: "MODEL_1",
    name: "TOPSIS",
    apiModelKey: "topsis"
  },
  alternatives: [
    {
      id: "A1",
      name: "Solar farm"
    },
    {
      id: "A2",
      name: "Wind farm"
    }
  ],
  criteriaTree: [
    {
      id: "CG1",
      name: "Sustainability",
      type: "benefit",
      expressionDomain: null,
      children: [
        {
          id: "C1",
          name: "Cost",
          type: "cost",
          expressionDomain: {
            id: "D1",
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
          },
          children: []
        }
      ]
    }
  ],
  leafCriteria: [
    {
      id: "C1",
      name: "Cost",
      type: "cost",
      expressionDomain: {
        id: "D1",
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
    }
  ]
};
```

Useful access examples:

```js
parameterContext.model.apiModelKey
parameterContext.leafCriteria[0].id
parameterContext.leafCriteria[0].name
parameterContext.alternatives[0].name
parameterContext.criteriaTree[0].children
```

Practical guidance:

- Use `parameterContext.leafCriteria` when a parameter depends on criterion IDs or labels.
- Use `parameterContext.criteriaTree` when a parameter needs the full ordered hierarchy.
- Use `parameterContext.alternatives` when a parameter depends on alternatives.
- Derive counts or label arrays locally when needed.
- Do not expect `leafNames` or derived count fields.
