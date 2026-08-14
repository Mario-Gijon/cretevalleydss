# Implement criteriaPreferenceOrder Frontend — Standalone LLM prompt

You are implementing the Frontend of a CreteValleyDSS Evaluation Structure.

You do NOT need repository access to complete this task.

Return complete replacement files ready to copy into the repository paths requested below.

Do not return diffs or isolated code fragments.

## Developer requirements

### Structure description

[STRUCTURE DESCRIPTION]

### Evaluation payload

Describe the canonical evaluation payload expected by the View.

[EVALUATION PAYLOAD DESCRIPTION]

### Desired UI / behavior

[DESIRED UI / BEHAVIOR]

### Additional requirements

[ADDITIONAL REQUIREMENTS]

### Actual runtime input — optional

If available, this section contains values captured from a real CreteValleyDSS execution.

The actual runtime object shape is authoritative if it differs from the representative example later in this prompt.

[ACTUAL RUNTIME INPUT]

## Frontend architecture

CreteValleyDSS uses plugin-owned Evaluation Structures.

The host loads the evaluation and `decisionContext`, owns loading/save/submit lifecycle, and renders the registered View.

The View is responsible only for the structure-specific presentation and manipulation of the in-memory evaluation payload.

Do not create new application fetching or persistence logic inside the View.

## Public View contract

The View receives exactly:

```js
{
  decisionContext,
  evaluation,
  setEvaluation,
  collectiveEvaluation,
  readOnly,
}
```

There is intentionally no `loading` prop.

### `decisionContext`

Contains the issue/model/problem information already resolved by CreteValleyDSS.

Use it instead of fetching the same data again.

### `evaluation`

The complete current evaluation payload.

Treat it as immutable.

### `setEvaluation(nextEvaluation)`

Replaces the complete evaluation payload.

It is not a patch API.

It is not called as:

```js
setEvaluation(id, value);
```

Instead, build the complete next payload and call:

```js
setEvaluation(nextEvaluation);
```

### `collectiveEvaluation`

May be `null`.

It contains collective evaluation data when the host makes it visible.

Treat it as read-only display data.

Do not invent its structure if the supplied requirements do not define it.

### `readOnly`

When `true`, prevent all changes to the expert evaluation.

## Representative runtime input

A representative serializable View input is:

```json
{
  "decisionContext": {
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
  },
  "evaluation": {},
  "collectiveEvaluation": null,
  "readOnly": false
}
```

`setEvaluation` is a function and is therefore not included in the serialized example.

Concrete IDs, names, stages, domains and values vary between issues.

Do not hard-code representative values.

## Expression Domains

CreteValleyDSS already provides the correct input component and validation for registered Expression Domain types.

If the expert is entering a value belonging to:

```js
criterion.expressionDomain
```

do not create a custom domain-specific input.

From the generated View package root, the public API can be imported as:

```js
import {
  ExpressionDomainEvaluationInput,
  validateExpressionDomainEvaluation,
} from "../../../../expressionDomains";
```

Typical usage:

```jsx
<ExpressionDomainEvaluationInput
  expressionDomain={criterion.expressionDomain}
  value={value}
  onChange={(nextValue) => {
    // Build a complete nextEvaluation object.
    // Then call setEvaluation(nextEvaluation).
  }}
  disabled={readOnly}
  error={Boolean(error)}
  showHelperText={false}
/>
```

The Expression Domain layer selects the correct UI from `expressionDomain.typeKey`.

Do not recreate:

- numeric continuous inputs;
- numeric discrete inputs;
- linguistic ordinal selectors;
- linguistic fuzzy selectors;
- linguistic 2-tuple selectors;
- registered domain-specific validation.

Frontend validation is available through:

```js
validateExpressionDomainEvaluation({
  value,
  expressionDomain,
});
```

The Evaluation Structure still owns its surrounding payload organization and structure-specific rules.

## Current generated files

The following source is the exact scaffold generated by Model Forge and is the starting integration contract.

### `Frontend/src/features/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/index.js`

```js
// Generated by ModelForge.
// Registers this Evaluation Structure View.
// See IMPLEMENTATION_GUIDE.md.

import { EVALUATION_STAGES } from "../../evaluationStages";
import CriteriaPreferenceOrderView from "./CriteriaPreferenceOrderView";
import { buildInitialEvaluation } from "./operations/buildInitialEvaluation";

export const criteriaPreferenceOrderStructure = Object.freeze({
  key: "criteriaPreferenceOrder",
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  implementationStatus: "scaffold",
  View: CriteriaPreferenceOrderView,
  buildInitialEvaluation,
});

```

### `Frontend/src/features/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/CriteriaPreferenceOrderView.jsx`

```jsx
// Generated by ModelForge.
// Implements this Evaluation Structure View.
// See IMPLEMENTATION_GUIDE.md.

import { Alert } from "@mui/material";

const CriteriaPreferenceOrderView = ({
  decisionContext,
  evaluation,
  setEvaluation,
  collectiveEvaluation,
  readOnly,
}) => {
  void decisionContext;
  void evaluation;
  void setEvaluation;
  void collectiveEvaluation;
  void readOnly;

  return (
    <Alert severity="info">
      criteriaPreferenceOrder is under development.
    </Alert>
  );
};

export default CriteriaPreferenceOrderView;

```

## Optional creator-side initialization

For this scaffold:

```text
scaffold_creator_api_operations = true
```

When this value is `true`, Model Forge also generates:

```text
Frontend/src/features/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/operations/buildInitialEvaluation.js
```

Its generated starting source is:

```js
// Generated by ModelForge.
// Builds the complete creator-side initial payload for this Evaluation Structure.
// See IMPLEMENTATION_GUIDE.md.

export const buildInitialEvaluation = ({ decisionContext }) => {
  void decisionContext;

  throw new Error(
    "criteriaPreferenceOrder buildInitialEvaluation must be implemented before creator-side use."
  );
};

```

Its contract is:

```js
buildInitialEvaluation({
  decisionContext,
}) => completeEvaluationObject
```

The returned value must be a complete plain object suitable for the View during creator-side criteria weighting.

Use only the supplied `decisionContext`.

If `scaffold_creator_api_operations` is `false`, do not create this operation.

## Implementation conventions

Keep the implementation simple.

The generated files are the minimum integration scaffold.

If additional files are genuinely useful, current Decision Plugin conventions are:

```text
components/
operations/
styles/
```

Use:

- `components/` for structure-specific React subcomponents;
- `operations/` for pure structure-specific logic;
- `styles/` for extracted MUI `sx`/style definitions.

Style filenames should normally follow:

```text
<ComponentName>.styles.js
```

Operation filenames should describe the operation directly, for example:

```text
buildRows.js
updateValue.js
validateValue.js
resolveCollective.js
```

Do not create extra folders or files merely to follow the convention.

Do not create generic `utils/`, `helpers/`, `services/` or hooks without a concrete need.

Use React and Material UI.

## Lifecycle

The generated Frontend registry starts with:

```js
implementationStatus: "scaffold"
```

Return `"ready"` in the final `index.js` only if the Frontend implementation described by this prompt is complete.

If essential behavior is not specified, do not invent domain rules merely to mark it ready.

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
- partial components;
- partial functions;
- pseudocode;
- TODO implementations.

If you create additional `components/`, `operations/` or `styles/` files, include their complete repository path and complete source.

Do not generate files that are unnecessary.

At minimum, return every generated Frontend source file that requires replacement for the completed implementation.
