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
- `context`

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
  context: {
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
    leafCriteriaCount: 2,
    leafNames: ["Cost", "Environmental impact"],
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
    alternativesCount: 2
  }
};
```

`onChange(nextValue)` is also received by editable components but is not represented in the object example because it is a function.

## Read-only component props

Read-only parameter components receive:

- `parameter`
- `value`
- `context`

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
  context: {
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
    leafCriteriaCount: 2,
    leafNames: ["Cost", "Environmental impact"],
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
    alternativesCount: 2
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
context.leafNames
context.alternativesCount
```
