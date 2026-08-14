# Implement criteriaPreferenceOrder Backend — Standalone LLM prompt

You are implementing the Backend of a CreteValleyDSS Evaluation Structure.

You do NOT need repository access to complete this task.

Return complete replacement files ready to copy into the repository paths requested below.

Do not return diffs or isolated code fragments.

## Developer requirements

### Structure description

criteriaPreferenceOrder represents a complete ordinal preference order over the
current leaf criteria of an issue.

The expert or issue creator ranks criteria from most important to least
important.

The structure owns only the ordinal ordering itself. It does not compute
criterion weights, positional scores, utility vectors, consensus, or MCC.

Those mathematical transformations belong to the criteria-weighting model that
consumes this Evaluation Structure.

The order is expressed using criterion IDs from decisionContext.leafCriteria,
never criterion names and never numeric rank values.

Example meaning:

["C5", "C2", "C1", "C3"]

means:

C5 ≻ C2 ≻ C1 ≻ C3

where C5 is the most important criterion and C3 is the least important.

Ties are not supported. A submitted evaluation must define a strict complete
order of all current leaf criteria.

### Evaluation payload

Describe the canonical payload that this structure should own.

The canonical payload is exactly:

{
"criterionOrder": [
"<criterion-id-most-important>",
"<criterion-id-second-most-important>",
"...",
"<criterion-id-least-important>"
]
}

criterionOrder is an ordered array of criterion ID strings.

Array position defines preference:

- index 0 = most important criterion;
- the final index = least important criterion.

The canonical source of valid criterion IDs is decisionContext.leafCriteria.

The payload must not store:

- criterion names;
- numeric rank values;
- weights;
- utility values;
- scores;
- expression-domain evaluations;
- MCC or consensus data.

The structure owns only criterionOrder.

For drafts, criterionOrder may contain only a subset of the current leaf
criteria while the user is still completing the order.

For a definitive submission, criterionOrder must contain every current leaf
criterion exactly once.

### Validation rules

Include draft/submit differences when relevant.

General rules:

- payload must be a plain object;
- payload.criterionOrder must be an array;
- every criterionOrder item must be a non-empty string criterion ID;
- every referenced ID must identify a current criterion from
decisionContext.leafCriteria;
- duplicate criterion IDs are forbidden;
- criterion order must be preserved exactly as supplied;
- ties are not represented or supported;
- criterion names must never be used as identifiers;
- do not derive validity from criteriaTree when leafCriteria is available;
decisionContext.leafCriteria is authoritative;
- do not apply Expression Domain validation because the payload evaluates the
relative importance of criteria themselves, not values inside their
expression domains.

Draft mode:

- an empty criterionOrder is valid;
- a partial ordered subset of the current leaf criteria is valid;
- every supplied criterion ID must still be valid and unique;
- unknown IDs and duplicate IDs are invalid even in draft mode.

Submit mode:

- criterionOrder must contain exactly the complete set of current leaf criterion
IDs;
- every leaf criterion must appear exactly once;
- no criterion may be missing;
- no additional criterion may appear;
- duplicates are forbidden;
- for N leaf criteria, criterionOrder.length must equal N.

The Backend must fail clearly if decisionContext.leafCriteria is unavailable,
invalid, contains invalid IDs, or contains duplicate IDs, because the structure
cannot safely validate a preference order without its canonical criterion set.

Normalization must not sort, re-rank, or otherwise change the semantic order
selected by the user.

### Additional requirements

Keep this structure intentionally small and strict.

GET behavior:

- when no stored payload exists, return:
{
"criterionOrder": []
}
- when a stored payload exists, return the canonical criterionOrder
representation expected by the Frontend;
- never derive or return criterion weights;
- never reorder criterionOrder.

SAVE behavior:

- normalize to the canonical object:
{
"criterionOrder": [...]
}
- do not persist unrelated payload properties;
- do not mutate the input payload;
- preserve criterionOrder order exactly.

Creator-side criterion remapping:

scaffold_creator_api_operations is true, so remapCriterionIds.js must be fully
implemented.

Only IDs inside payload.criterionOrder belong to this structure and may be
remapped.

criterionIdMap is expected to be a Map from temporary creator-side criterion IDs
to persisted criterion IDs.

For every ID present in criterionOrder:

- require a valid non-empty source criterion ID;
- require a valid mapped persisted criterion ID;
- fail if a referenced criterion cannot be remapped;
- preserve array order exactly.

Do not perform generic recursive string replacement and do not remap arbitrary
strings elsewhere in the payload.

The remapped payload must remain:

{
"criterionOrder": [...]
}

The implementation is complete when Backend GET, SAVE, draft/submit validation
and creator-side criterion-ID remapping satisfy this contract.

At that point index.js should change:

implementationStatus: "scaffold"

to:

implementationStatus: "ready"

Do not implement the later rank-to-utility transformation here.

In particular, do not implement:

- positional scores;
- rank-to-weight conversion;
- utility normalization;
- MCC;
- consensus;
- aggregation across experts.

Those belong to the criteria-weighting model, not to this Evaluation Structure.



### Actual runtime input — optional

If available, this section contains values captured from a real CreteValleyDSS execution.

The actual runtime object shape is authoritative if it differs from the representative example later in this prompt.

Not available yet.

Use the representative decisionContext documented below in this prompt.
Do not invent additional runtime fields or depend on concrete example IDs.

## Project architecture

CreteValleyDSS uses plugin-owned Evaluation Structures.

Evaluation payloads are persisted in MongoDB using Mongoose `Schema.Types.Mixed`.

There is deliberately no universal database payload shape for every Evaluation Structure.

Each Evaluation Structure owns:

- its canonical payload shape;
- structure-specific validation;
- normalization before persistence;
- draft versus submit requirements.

`Schema.Types.Mixed` provides structural flexibility. It does NOT mean that arbitrary payloads should be accepted.

Do not solve this implementation by changing shared persistence schemas.

## Public Backend contract

Preserve the generated function signatures and exports.

### GET

```js
async ({
payload,
decisionContext,
}) => frontendPayload
```

`payload` is the stored evaluation payload or `null`.

Return the complete payload consumed by the Frontend.

If the canonical stored representation already matches the required Frontend representation, prefer returning it directly.

### SAVE

```js
async ({
payload,
decisionContext,
mode,
}) => storedPayload
```

`mode` is:

- `"draft"` — incomplete payloads may be accepted when appropriate;
- `"submit"` — the definitive submission must satisfy every required rule.

Return the complete normalized payload to persist.

Do not mutate the input payload.

## Representative `decisionContext`

A representative runtime object is:

```json
{
"issue": {
"id": "ISSUE_1",
"name": "Supplier selection",
"currentStage": "criteriaWeighting",
"consensusPhase": 0,
"isConsensus": false,
"consensusThreshold": null,
"consensusMaxPhases": null
},
"structure": {
"key": "criteriaPreferenceOrder",
"stage": "criteriaWeighting"
},
"model": {
"id": "MODEL_1",
"name": "Example model",
"apiModelKey": "example_model"
},
"modelParameters": {},
"criteriaWeightingParameters": {},
"alternatives": [
{
"id": "ALT_1",
"name": "Supplier A"
},
{
"id": "ALT_2",
"name": "Supplier B"
}
],
"criteriaTree": [
{
"id": "CRIT_1",
"name": "Cost",
"type": "cost",
"expressionDomain": {
"id": "DOMAIN_1",
"_id": "DOMAIN_1",
"name": "Cost scale",
"typeKey": "numericContinuous",
"definition": {
"min": 0,
"max": 100,
"step": null
}
},
"children": []
}
],
"leafCriteria": [
{
"id": "CRIT_1",
"name": "Cost",
"type": "cost",
"expressionDomain": {
"id": "DOMAIN_1",
"_id": "DOMAIN_1",
"name": "Cost scale",
"typeKey": "numericContinuous",
"definition": {
"min": 0,
"max": 100,
"step": null
}
}
}
],
"experts": [
{
"id": "EXPERT_1",
"name": "Expert A"
}
],
"criteriaWeights": {},
"expertWeights": {},
"consensus": {
"phase": 0,
"maxPhases": null,
"threshold": null,
"currentCollectiveEvaluations": {},
"previousCollectiveEvaluations": {}
}
}
```

Concrete IDs, names, stages, domains and collections vary between issues.

Do not hard-code the representative values.

Use IDs and data dynamically from `decisionContext`.

## Expression Domains

CreteValleyDSS already owns validation rules for Expression Domain values.

If this structure stores evaluations against:

```js
criterion.expressionDomain
```

reuse the existing Backend validation layer.

The existing API includes:

```js
validateExpressionDomainEvaluationOrThrow({
value,
expressionDomain,
});
```

The canonical Expression Domain must come from the relevant criterion supplied by `decisionContext`.

Do not implement your own:

- numeric range validation;
- discrete-value validation;
- linguistic ordinal validation;
- linguistic fuzzy validation;
- linguistic 2-tuple validation;
- other Expression Domain-specific coercion or validation.

The Evaluation Structure still owns validation of its surrounding payload shape.

## Current generated files

The following source is the exact scaffold generated by Model Forge and is the starting integration contract.

### `Backend/modules/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/index.js`

```js
// Generated by ModelForge.
// Registers this Evaluation Structure.
// See IMPLEMENTATION_GUIDE.md.

import { EVALUATION_STAGES } from "../../evaluationStages.js";
import { getCriteriaPreferenceOrderPayload } from "./criteriaPreferenceOrder.get.js";
import { saveCriteriaPreferenceOrderPayload } from "./criteriaPreferenceOrder.save.js";
import {
remapCriteriaPreferenceOrderCriterionIds,
} from "./operations/remapCriterionIds.js";

export const criteriaPreferenceOrder = Object.freeze({
key: "criteriaPreferenceOrder",
stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
implementationStatus: "scaffold",
get: getCriteriaPreferenceOrderPayload,
save: saveCriteriaPreferenceOrderPayload,
remapCriterionIds: remapCriteriaPreferenceOrderCriterionIds,
});

```

### `Backend/modules/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/criteriaPreferenceOrder.get.js`

```js
// Generated by ModelForge.
// Prepares this Evaluation Structure payload for the Frontend.
// See IMPLEMENTATION_GUIDE.md.

export const getCriteriaPreferenceOrderPayload = async ({
payload,
decisionContext,
}) => {
void decisionContext;

return payload ?? {};
};

```

### `Backend/modules/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/criteriaPreferenceOrder.save.js`

```js
// Generated by ModelForge.
// Validates and normalizes this Evaluation Structure payload before persistence.
// See IMPLEMENTATION_GUIDE.md.

export const saveCriteriaPreferenceOrderPayload = async ({
payload,
decisionContext,
mode,
}) => {
void decisionContext;
void mode;

return payload;
};

```

## Optional creator criteria-weighting operation

For this scaffold:

```text
scaffold_creator_api_operations = true
```

When this value is `true`, Model Forge also generates:

```text
Backend/modules/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/operations/remapCriterionIds.js
```

Its generated starting source is:

```js
// Generated by ModelForge.
// Remaps creator-side temporary criterion IDs owned by this payload.
// See IMPLEMENTATION_GUIDE.md.

export const remapCriteriaPreferenceOrderCriterionIds = ({
payload,
criterionIdMap,
}) => {
void payload;
void criterionIdMap;

throw new Error(
"criteriaPreferenceOrder remapCriterionIds must be implemented before creator-side use."
);
};

```

Implement it only when `scaffold_creator_api_operations` is `true`.

If it is `false`, do not create that operation.

Criterion remapping must target only the criterion references actually owned by the payload.

Do not implement generic recursive string replacement.

## Implementation conventions

Keep the implementation simple.

The generated files are the minimum integration scaffold, not a requirement to keep all logic in one file.

If additional files are genuinely useful:

- pure structure-specific operations belong in `operations/`;
- use descriptive filenames such as:
- `normalizePayload.js`
- `validatePayload.js`
- `remapCriterionIds.js`

Do not create generic `utils/`, `helpers/`, `services/`, adapters or abstractions without a concrete need.

Do not change shared persistence schemas or application architecture.

## Lifecycle

The generated registry starts with:

```js
implementationStatus: "scaffold"
```

Return `"ready"` in the final `index.js` only if the implementation described by this prompt is complete.

If required behavior is impossible to determine from the supplied requirements, do not invent domain rules merely to mark the structure ready.

## Required output

Return every file that must be created or replaced.

For each file, clearly print:

```text
FILE: <complete repository path>
```

Immediately after it, provide one fenced code block containing the complete file contents in the appropriate language.

Return complete source files.

Do not return:

- diffs;
- ellipses;
- partial methods;
- pseudocode;
- TODO implementations.

If you create an additional operation, include its complete repository path and complete source.

Do not generate files that are unnecessary.

At minimum, return every generated Backend source file that requires replacement for the completed implementation.