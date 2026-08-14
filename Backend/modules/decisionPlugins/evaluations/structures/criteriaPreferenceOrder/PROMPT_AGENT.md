# Implement criteriaPreferenceOrder Backend — Agent prompt

You are a repository-aware coding agent working inside CreteValleyDSS.

Implement the Backend of the generated Evaluation Structure:

```text
Backend/modules/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/
```

## Read first

Read the complete generated package, especially:

```text
Backend/modules/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/index.js
Backend/modules/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/criteriaPreferenceOrder.get.js
Backend/modules/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/criteriaPreferenceOrder.save.js
Backend/modules/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/IMPLEMENTATION_GUIDE.md
```

Also read the generated Frontend package for this same Evaluation Structure if understanding the agreed payload/UI contract requires it.

If `operations/remapCriterionIds.js` exists, read it too.

The current repository state is authoritative.

## Developer requirements

### Structure description

[STRUCTURE DESCRIPTION]

### Evaluation payload

Describe the canonical payload that this structure should own.

[EVALUATION PAYLOAD DESCRIPTION]

### Validation rules

Include draft/submit differences when relevant.

[VALIDATION RULES]

### Additional requirements

[ADDITIONAL REQUIREMENTS]

### Actual runtime input — optional

If available, the following was captured from a real CreteValleyDSS execution.

Treat the actual runtime object shape as authoritative if it differs from a representative example.

[ACTUAL RUNTIME INPUT]

## Project context

CreteValleyDSS uses plugin-owned Evaluation Structures.

Evaluation payloads are intentionally persisted using Mongoose `Schema.Types.Mixed`, so there is no universal evaluation payload shape enforced by the database.

This flexibility does NOT mean that arbitrary payloads are valid.

This Evaluation Structure owns:

- its canonical payload shape;
- structure-specific validation;
- normalization before persistence;
- draft versus submit requirements.

Do not modify shared persistence schemas merely to support this plugin.

Do not add structure-specific fields to shared `Issue` or `IssueEvaluation` models.

## Public Backend contract

Preserve the generated public integration contract.

### GET

```js
async ({
  payload,
  decisionContext,
}) => frontendPayload
```

The GET handler prepares the complete payload consumed by the Frontend.

If the canonical stored payload already has the correct shape, do not transform it unnecessarily.

### SAVE

```js
async ({
  payload,
  decisionContext,
  mode,
}) => storedPayload
```

`mode` is `"draft"` or `"submit"`.

Draft may allow incomplete data when appropriate.

Submit must enforce the definitive submission rules.

Return the complete normalized payload that should be persisted.

Do not mutate the input payload.

## `decisionContext`

Use the data already provided through `decisionContext`.

It may contain:

- issue metadata;
- evaluation structure metadata;
- selected model;
- model parameters;
- criteria-weighting parameters;
- alternatives;
- criteria tree;
- leaf criteria;
- experts;
- criteria weights;
- expert weights;
- consensus state and collective evaluations.

Do not introduce Backend queries or API calls for data already present there.

## Expression Domains

If a payload value represents an evaluation against a criterion's Expression Domain:

1. take the canonical domain from the relevant criterion in `decisionContext`;
2. reuse the existing Backend Expression Domain validation infrastructure;
3. do not reproduce domain-specific validation inside this structure.

The existing validation boundary includes:

```js
validateExpressionDomainEvaluationOrThrow({
  value,
  expressionDomain,
});
```

Do not manually recreate:

- numeric continuous/discrete validation;
- linguistic ordinal validation;
- linguistic fuzzy validation;
- linguistic 2-tuple validation;
- any other registered Expression Domain validation.

The Evaluation Structure must still validate its own surrounding payload shape.

## File organization

Keep the implementation as small as practical.

Start from the generated scaffold.

Do not create helpers or directories preemptively.

When additional files are genuinely useful:

- pure structure-specific logic belongs in `operations/`;
- operation filenames should describe the operation directly, for example:
  - `normalizePayload.js`
  - `validatePayload.js`
  - `remapCriterionIds.js`

Do not create generic `utils/`, `helpers/`, `services/`, adapters or abstractions unless they are clearly necessary.

## Creator criteria-weighting operation

If the generated package contains:

```text
operations/remapCriterionIds.js
```

implement its existing contract.

It is used after temporary creator-side criterion IDs have been replaced by persisted criterion IDs.

Do not implement generic recursive string replacement.

Remap only the criterion references actually owned by this payload.

If the payload genuinely contains no criterion IDs, explicitly return the payload unchanged.

If the file does not exist, do not create it merely because this prompt mentions it.

## Existing implementations

You may inspect existing Evaluation Structures for project conventions when useful.

Prefer the closest relevant implementation.

Do not blindly copy:

- payload shapes;
- validation rules;
- UI assumptions;
- criterion mappings;
- model-specific behavior.

## Scope restrictions

Do not modify:

- ModelForge templates;
- shared MongoDB schemas;
- decisionContext builders;
- Expression Domain implementations;
- unrelated Evaluation Structures;
- Model Forge UI;
- DecisionModelsService algorithms.

Do not redesign the plugin architecture.

Do not add compatibility fallbacks unless required by an existing public contract.

## Lifecycle

Keep:

```js
implementationStatus: "scaffold"
```

while implementation is incomplete.

Change it to:

```js
implementationStatus: "ready"
```

only after the structure is completely implemented and the relevant tests pass.

## Validation

Add or update focused tests for the implemented structure.

Cover the behavior that applies to this structure, including where relevant:

- canonical valid payload;
- invalid payload shape;
- unknown/missing IDs;
- draft behavior;
- submit behavior;
- Expression Domain validation.

Use existing repository test conventions.

Run focused Backend tests first, then the appropriate Backend lint/test validation available in the repository.

Finally run:

```text
git diff --check
```

Do not install dependencies.

## Final report

Modify the repository directly.

Do not paste every complete source file in the final response.

Report:

1. Files created.
2. Files modified.
3. Canonical payload implemented.
4. Draft versus submit behavior.
5. Expression Domain infrastructure reused, if applicable.
6. Any `operations/` files added and why they were necessary.
7. Whether `implementationStatus` remains `scaffold` or became `ready`.
8. Tests executed and results.
9. `git diff --check` result.
10. Any remaining limitation.

Implement only what is required for this Evaluation Structure.
