# Frontend Parameter Component Contract

This reference describes the props contract for frontend model parameter components.

The examples below are representative and may vary by model. They show the standard contract that generated parameter components should expect.

## Editable component props

Editable parameter components receive:

- `parameter`
- `value`
- `onChange`
- `disabled`
- `error`
- `parameterContext`

Representative example:

```js
const editablePropsExample = {
  parameter: {
    key: "beta",
    label: "Beta",
    parameterStructureKey: "numberGlobal",
    required: true,
    default: 0.8,
    restrictions: {
      min: 0,
      max: 1,
      allowed: null
    }
  },
  value: 0.8,
  disabled: false,
  error: "",
  parameterContext: {
    model: {
      id: "MODEL_1",
      name: "TOPSIS",
      apiModelKey: "topsis"
    },
    leafCriteria: [
      {
        id: "C1",
        name: "Cost"
      },
      {
        id: "C2",
        name: "Environmental impact"
      }
    ],
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
    criteriaTree: []
  }
};
```

`onChange(nextValue)` is also received by editable components but is not represented in the object example because it is a function.

## Read-only component props

Read-only parameter components receive:

- `parameter`
- `value`
- `parameterContext`

Representative example:

```js
const readOnlyPropsExample = {
  parameter: {
    key: "beta",
    label: "Beta",
    parameterStructureKey: "numberGlobal",
    required: true,
    default: 0.8,
    restrictions: {
      min: 0,
      max: 1,
      allowed: null
    }
  },
  value: 0.8,
  parameterContext: {
    model: {
      id: "MODEL_1",
      name: "TOPSIS",
      apiModelKey: "topsis"
    },
    leafCriteria: [
      {
        id: "C1",
        name: "Cost"
      },
      {
        id: "C2",
        name: "Environmental impact"
      }
    ],
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
    criteriaTree: []
  }
};
```

Important notes:

- `parameter.key` is the concrete model parameter key such as `beta` or `criterion_profiles`.
- `parameter.parameterStructureKey` is the reusable or specific structure key such as `numberGlobal` or `selectCriterion`.
- `restrictions` is optional. Some structures use it heavily and some do not.
- Use `onChange(nextValue)` to update local parameter value state.
- Do not mutate `value`.
- Do not call APIs directly from the component.
- Do not know about MongoDB or raw issue documents.

Useful access examples:

```js
parameter.key
parameter.restrictions?.min
value
parameterContext.leafCriteria.map((criterion) => criterion.name)
parameterContext.alternatives.map((alternative) => alternative.name)
```
