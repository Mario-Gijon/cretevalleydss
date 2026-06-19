# Backend Parameter Handler Contract

This reference describes the arguments and return contract for backend model parameter handlers.

These examples are representative and may vary by model parameter. The handler should stay focused on structure-specific normalization and validation.

## Handler input

Backend parameter handlers receive:

- `value`
- `parameter`
- `context`

Simple example:

```js
const handlerInputExample = {
  value: 0.8,
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
  context: {
    modelName: "Herrera Viedma CRP",
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
    alternativesCount: 2
  }
};
```

Complex value example:

```js
const complexValueExample = {
  value: {
    C1: [0.2, 0.5, 0.8],
    C2: [0.1, 0.4, 0.9]
  },
  parameter: {
    key: "criterion_profiles",
    label: "Criterion profiles",
    parameterStructureKey: "orderedProfilesByCriterion",
    required: true,
    default: {
      C1: [0.2, 0.5, 0.8],
      C2: [0.1, 0.4, 0.9]
    },
    restrictions: {
      min: 0,
      max: 1,
      ordered: "strictIncreasing",
      minLength: 3
    }
  },
  context: {
    modelName: "Example Model",
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
    alternativesCount: 2
  }
};
```

## Return contract

Handlers return one of these shapes:

```js
toValid(normalizedValue)
toInvalid(message, receivedValue)
```

Representative valid result:

```js
const validResultExample = {
  ok: true,
  value: 0.8
};
```

Representative invalid result:

```js
const invalidResultExample = {
  ok: false,
  message: "must be between 0 and 1",
  value: 1.7
};
```

Practical guidance:

- Normalize before returning valid values.
- Keep structure-specific validation here.
- `restrictions` is optional.
- Do not access Express request/response.
- Do not access MongoDB.
- Do not know about raw issue documents.

Useful access examples:

```js
value
parameter.key
parameter.restrictions?.ordered
context.modelName
context.leafCriteriaCount
```
