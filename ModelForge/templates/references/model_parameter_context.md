# Frontend Model Parameter Context

This reference describes the generalized frontend `context` object passed to model parameter components.

Treat this object as read-only. Do not access MongoDB. Do not depend on raw issue documents.

Representative example:

```js
const contextExample = {
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
};
```

What each field contains:

- `leafCriteria`: ordered leaf criterion items already resolved for the current model/issue context.
- `leafCriteriaCount`: derived count of `leafCriteria`.
- `leafNames`: ordered criterion names extracted from the same context.
- `alternatives`: ordered alternatives available in the current issue context.
- `alternativesCount`: derived count of `alternatives`.

Useful access examples:

```js
context.leafCriteria
context.leafCriteria[0].name
context.leafCriteriaCount
context.leafNames
context.leafNames[0]
context.alternatives
context.alternatives[0].name
context.alternativesCount
```

Practical guidance:

- Use `context.leafCriteria` when a parameter depends on criterion IDs or names.
- Use `context.leafNames` when only names are needed for labels or iteration.
- Use `context.alternatives` when a parameter depends on alternatives rather than criteria.
- Keep the component isolated from persistence or API concerns.
