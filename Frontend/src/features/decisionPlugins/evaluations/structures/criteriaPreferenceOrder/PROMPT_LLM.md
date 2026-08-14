# Implement criteriaPreferenceOrder Frontend — Standalone LLM prompt

You are implementing the Frontend of a CreteValleyDSS Evaluation Structure.

This prompt is intentionally self-contained. Do NOT require repository access.

## Developer requirements

### Structure description
criteriaPreferenceOrder is the Frontend editor for a strict ordinal preference
order over the current leaf criteria.

The issue creator or an expert ranks the current leaf criteria from most
important to least important.

The canonical criterion universe comes from:

decisionContext.leafCriteria

The structure owns only the order of criterion IDs.

It does NOT calculate or display criterion weights, positional scores,
normalized utilities, MCC results or expert aggregation.

Those responsibilities belong to the criteria-weighting model that later
consumes this evaluation.

The semantic order is:

criterionOrder[0] = most important criterion

and each subsequent array position represents decreasing importance.

Ties are not supported.

A draft may contain no ranked criteria or only a partial ranking.

A submitted evaluation is expected by the Backend to contain every current leaf
criterion exactly once.

The Frontend must therefore make it easy to progressively build and reorder the
strict ranking without inventing an initial preference order.

### Canonical evaluation payload
The complete canonical Frontend evaluation payload is exactly:

{
  "criterionOrder": [
    "<criterion-id-most-important>",
    "<criterion-id-second-most-important>",
    "...",
    "<criterion-id-least-important>"
  ]
}

criterionOrder is an ordered array of criterion ID strings.

Array position is semantically meaningful:

- index 0 is the most important criterion;
- increasing indices mean decreasing importance;
- the final item is the least important ranked criterion.

The valid criterion IDs come from:

decisionContext.leafCriteria

The Frontend must emit exactly this canonical payload shape through
setEvaluation(nextEvaluation).

Do not store or emit:

- criterion names;
- explicit numeric rank values;
- criterion objects;
- criterion weights;
- positional scores;
- normalized utilities;
- Expression Domain values;
- MCC information;
- consensus information;
- local UI state.

Criterion names are presentation-only and must be resolved dynamically from
decisionContext.leafCriteria.

Draft payloads may contain:

{
  "criterionOrder": []
}

or any ordered subset of the current leaf criterion IDs.

The semantic ordering in criterionOrder must always be preserved.

### Desired UI / behavior
Build a compact Material UI preference-order editor.

The interface should clearly distinguish:

1. criteria that have already been ranked;
2. criteria that have not yet been ranked.

Do not automatically place every criterion into criterionOrder when the current
evaluation is empty.

An empty criterionOrder means the user has not established any preference yet.
Automatically filling it with decisionContext.leafCriteria order would invent a
preference and is forbidden.

RANKED CRITERIA

Display ranked criteria vertically in the exact order stored in
evaluation.criterionOrder.

The first ranked criterion must visually mean "Most important".

The final ranked criterion must visually mean "Least important" when more than
one criterion is ranked.

Each ranked row should show:

- its visual rank number, starting at 1;
- the criterion name resolved from decisionContext.leafCriteria;
- a control to move it one position upward;
- a control to move it one position downward;
- a control to remove it from the ranking.

Numeric rank labels are presentation-only.

Never store the numeric rank in the evaluation payload.

Moving a criterion upward must swap it with the immediately previous item.

Moving a criterion downward must swap it with the immediately following item.

Disable or omit the upward control for the first ranked criterion.

Disable or omit the downward control for the final ranked criterion.

Removing a criterion must remove only that criterion ID from criterionOrder.
The criterion then becomes available again in the unranked section.

UNRANKED CRITERIA

Determine unranked criteria from:

decisionContext.leafCriteria

minus the IDs currently present in evaluation.criterionOrder.

Display them in the same order in which they appear in
decisionContext.leafCriteria.

This presentation order is NOT a preference order.

Each unranked criterion should show its name and a compact action to add it to
the ranking.

Adding an unranked criterion must append its ID to the end of criterionOrder.

Do not automatically reorder existing ranked criteria when adding a new one.

Do not implement an "add all" action that implicitly assigns preference based on
decisionContext.leafCriteria order.

EMPTY STATE

When criterionOrder is empty:

- clearly explain that no criteria have been ranked yet;
- show all current leaf criteria as available/unranked criteria;
- allow the user to begin the ranking by adding one.

Do not show a misleading error simply because the draft ranking is empty.

COMPLETE STATE

When every current leaf criterion is ranked:

- the unranked section may be hidden or replaced by a compact completion
  indication;
- keep the ranked list editable unless readOnly is true.

READ-ONLY

When readOnly is true:

- do not allow add;
- do not allow remove;
- do not allow move up;
- do not allow move down;
- show the existing ranking clearly;
- if the stored draft is partial, it is acceptable to show the remaining
  criteria under a non-editable "Not ranked" section.

COLLECTIVE EVALUATION

This structure does not own consensus or MCC presentation.

Do not invent a collectiveEvaluation payload shape.

Do not display collective weighting or consensus information merely because the
prop exists.

The criteria-weighting model is responsible for later multi-expert aggregation.

INVALID INPUT HANDLING

The Backend is responsible for canonical validation, but the View must fail
gracefully if it receives obviously unusable data.

If:

- decisionContext.leafCriteria is not an array;
- evaluation is not a plain object;
- evaluation.criterionOrder is not an array;
- criterionOrder contains duplicate IDs;
- criterionOrder references IDs not present in decisionContext.leafCriteria;

render a compact Material UI error Alert instead of silently repairing,
reordering or discarding the invalid data.

Do not call setEvaluation automatically to repair malformed input.

INTERACTION / ACCESSIBILITY

Use Material UI controls.

Compact IconButtons with Tooltips are appropriate for move-up, move-down and
remove actions.

Use accessible labels such as:

- "Move <criterion name> up"
- "Move <criterion name> down"
- "Remove <criterion name> from ranking"
- "Add <criterion name> to ranking"

Do not rely only on arrow icons or color to communicate an action.

VISUAL DIRECTION

The ranking should be easy to scan vertically.

Clearly communicate:

Most important
↓
...
↓
Least important

without requiring the user to understand internal IDs.

Use the CreteValleyDSS compact visual language already supplied in this prompt:

- Material UI;
- theme-aware colors;
- subtle borders;
- compact spacing;
- cyan/info accents for useful interactive emphasis;
- responsive layout;
- no oversized cards;
- no new design system.

Do not introduce drag-and-drop or a new dependency.

Use simple deterministic add/remove/up/down behavior implemented with the
existing React and Material UI stack.

### Additional requirements
Keep the implementation focused and avoid unnecessary React state or
abstractions.

The canonical evaluation prop is the source of truth.

Do not copy evaluation.criterionOrder into local React state.

All ranking changes must produce a fresh complete payload and call:

setEvaluation({
  criterionOrder: nextCriterionOrder
});

Do not mutate:

- evaluation;
- evaluation.criterionOrder;
- decisionContext;
- decisionContext.leafCriteria.

Prefer small pure operations when they materially improve clarity.

It is reasonable to create operations such as:

- moveCriterion.js;
- addCriterion.js;
- removeCriterion.js;
- resolvePreferenceOrder.js;

but do not create files merely to satisfy a folder convention.

Do not create generic hooks, services or helper frameworks.

Criterion identity:

- use criterion.id as canonical identity;
- use criterion.name only for display;
- never persist the name;
- do not use array indices as criterion identity.

Visual rank numbers must be derived from the current array index:

displayRank = index + 1

They must never be written into the evaluation payload.

The order of unranked criteria must follow decisionContext.leafCriteria only for
stable presentation.

That unranked-list order must never be interpreted or persisted as an ordinal
preference.

Creator-side initialization:

buildInitialEvaluation({ decisionContext }) must be fully implemented.

It must use decisionContext and return exactly:

{
  criterionOrder: []
}

Before returning the initial payload, verify that
decisionContext.leafCriteria is usable for this structure:

- decisionContext must be an object;
- decisionContext.leafCriteria must be an array;
- every leaf criterion must have a non-empty string id after trimming;
- normalized criterion IDs must be unique.

If the creator-side context is unusable, fail explicitly rather than creating a
misleading initial ranking.

Do NOT initialize criterionOrder with the current leaf criterion IDs.

Doing so would incorrectly convert the arbitrary current criterion collection
order into a user preference order.

Do not implement:

- criterion weights;
- rank-to-score conversion;
- normalized utility calculation;
- MCC;
- expert aggregation;
- consensus;
- Expression Domain input controls.

This structure ranks criteria themselves, so Expression Domain evaluation UI is
not applicable.

The Frontend implementation is complete when:

- an empty draft can be displayed and edited;
- criteria can be added to the ranking;
- criteria can be removed from the ranking;
- ranked criteria can be moved upward/downward;
- every action emits the exact complete canonical payload;
- partial drafts are supported;
- a complete ranking is supported;
- readOnly prevents every mutation;
- malformed runtime data fails visibly rather than being silently repaired;
- creator-side buildInitialEvaluation returns the correct empty canonical
  payload;
- the UI integrates visually with the Material UI theme described by this
  prompt.

When all of these behaviors are implemented, change:

implementationStatus: "ready"

### Actual runtime input — optional
Not available yet.

Use only the View contract, representative decisionContext and canonical payload
contract provided by this prompt.

Do not invent additional decisionContext fields.

Do not depend on the representative IDs or names.

The implementation must work dynamically with any valid
decisionContext.leafCriteria supplied at runtime.

A normal initial creator-side evaluation should be treated conceptually as:

{
  "criterionOrder": []
}

with the actual criteria obtained dynamically from
decisionContext.leafCriteria.

## Exact generated package location

```text
Frontend/src/features/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/
```

Exact generated runtime paths:

```text
Frontend/src/features/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/index.js
Frontend/src/features/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/CriteriaPreferenceOrderView.jsx
```

When creator-side initialization is generated:

```text
Frontend/src/features/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/operations/buildInitialEvaluation.js
```

Do not invent another location.

## Host/View architecture

The host owns loading, fetching, save, submit, persistence and dialog lifecycle.

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

There is no `loading` prop.

`evaluation` is the complete canonical current payload.

Treat it as immutable.

`setEvaluation(nextEvaluation)` replaces the COMPLETE evaluation. It is not a
patch API and not `(id, value)`.

`collectiveEvaluation` may be null. Treat it as read-only presentation data and
do not invent its nested shape unless requirements define it.

When `readOnly === true`, prevent every mutating interaction.

## Representative View input

```json
{
  "decisionContext": {
    "issue": {
      "id": "ISSUE_1",
      "name": "Supplier selection",
      "currentStage": "criteriaWeighting"
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
      { "id": "ALT_1", "name": "Supplier A" }
    ],
    "criteriaTree": [],
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
      { "id": "EXPERT_1", "name": "Expert A" }
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

`setEvaluation` is a function and is omitted from serialized examples.

Do not hard-code representative values.

## Exact Expression Domain Frontend API

The public module is:

```text
Frontend/src/features/expressionDomains/index.js
```

From a component directly in the generated Evaluation Structure root:

```js
import {
  ExpressionDomainEvaluationInput,
  validateExpressionDomainEvaluation,
} from "../../../../expressionDomains";
```

If moved one directory deeper into `components/`, adjust the relative path by
one additional `../`.

The public API exports:

```js
export { default as ExpressionDomainEvaluationInput } from "./ExpressionDomainEvaluationInput.jsx";
export { validateExpressionDomainEvaluation } from "./validateExpressionDomainEvaluation";
```

Typical usage:

```jsx
<ExpressionDomainEvaluationInput
  expressionDomain={criterion.expressionDomain}
  value={value}
  onChange={(nextValue) => {
    const nextEvaluation = /* immutable complete evaluation */;
    setEvaluation(nextEvaluation);
  }}
  disabled={readOnly}
  error={Boolean(error)}
  showHelperText={false}
/>
```

Do not recreate registered numeric, linguistic, fuzzy or linguistic 2-tuple
inputs/validation.

If this structure does not edit Expression Domain evaluation values, do not
force this API into it.


## Exact CreteValleyDSS Frontend/theme context

CreteValleyDSS already mounts the application with Material UI:

```jsx
<ThemeProvider theme={theme} disableTransitionOnChange>
  <CssBaseline enableColorScheme />
  <GlobalStyles styles={appGlobalStyles} />
  ...
</ThemeProvider>
```

Do not create another `ThemeProvider`, global theme or parallel design system.

The application uses `@mui/material` and supports both light and dark schemes.

The current theme contract is:

```js
const FONT_FAMILY = "Source Sans Pro, Arial, sans-serif";

let theme = extendTheme({
  typography: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    h1: { fontWeight: "bold" },
    h2: { fontWeight: "bold" },
    h3: { fontWeight: "bold" },
    h4: { fontWeight: "bold" },
    h5: { fontWeight: "bold" },
    h6: { fontWeight: "bold" },
    subtitle1: { fontWeight: "normal" },
    subtitle2: { fontWeight: "bold" },
    body1: { fontWeight: "normal" },
    body2: { fontWeight: "normal" },
    button: { fontWeight: "bold" },
    caption: { fontWeight: "normal" },
    overline: { fontWeight: "normal" },
  },
  colorSchemes: {
    light: {
      palette: {
        mode: "light",
        primary: {
          main: "#134F8A",
          light: "#134F8A",
        },
        secondary: {
          main: "#45C5C5",
          contrastText: "#fff",
        },
        background: {
          default: "#F5F0F6",
          paper: "#FFFFFF",
        },
        text: {
          primary: "#1D1D1B",
          secondary: "#545454",
          disabled: "#134F8A",
        },
        info: {
          main: "#45C5C5",
          contrastText: "#fff",
        },
      },
    },
    dark: {
      palette: {
        mode: "dark",
        primary: {
          main: "#224261",
          light: "#45C5C5",
        },
        secondary: {
          main: "#45C5C5",
        },
        background: {
          default: "#1D1D1B",
          paper: "#262B32",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#BFBFBF",
          disabled: "#9AECA4",
          info: "#45C5C5",
        },
        info: {
          main: "#45C5C5",
        },
      },
    },
  },
  colorSchemeSelector: "class",
});
```

Prefer semantic theme values in `sx` rather than copying literal colors:

```js
bgcolor: "background.paper"
color: "text.primary"
borderColor: "divider"
```

Use `secondary`/`info` accents for selected or interactive states when useful.

The app's plugin UI is intentionally compact:

- use `Stack`, `Box`, `Paper`, `Typography`, `Alert`, `Button`,
  `IconButton`, `TextField`, `Select`, etc. from Material UI as appropriate;
- prefer spacing around 1–1.5 theme units for compact plugin surfaces;
- prefer modest padding around 1–1.5 units;
- `borderRadius: 2` is a common compact surface radius;
- use subtle borders/dividers;
- use `body2` or `caption` for explanations;
- avoid giant cards, large empty areas and oversized controls;
- make selected/active states clear but restrained;
- wrap/reflow on narrow screens rather than assuming a fixed wide layout;
- preserve accessibility and do not communicate meaning only through color.

Do not introduce Tailwind, Bootstrap, styled-components, another component
library, a new ThemeProvider or a new global CSS architecture.

Prefer MUI `sx`. Extract `styles/<ComponentName>.styles.js` only when styling is
large enough that extraction improves readability.



## React implementation rules

Prefer the simplest state model that satisfies the UI:

- host-provided `evaluation`/`value` is the source of truth;
- treat props and nested objects/arrays as immutable;
- do not mirror props into component state without a genuine interaction/lifecycle
  requirement;
- do not add `useEffect` merely to synchronize a value that can be derived during
  render;
- derive inexpensive values directly;
- use `useMemo`/`useCallback` only for a concrete reason;
- do not create a custom hook for a single local use;
- do not fetch data already provided through `decisionContext` or
  `parameterContext`;
- do not create compatibility aliases or alternate payload shapes unless the
  supplied public contract requires them;
- do not add dependencies when React, Material UI and platform APIs are enough.



## Reference Frontend implementation from an existing Evaluation Structure

This is a real project example showing package organization and React/MUI style.
It is a reference for conventions only; do not copy its matrix-specific behavior
unless requested.

```jsx
import { useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Alert, Box, useTheme } from "@mui/material";

import { buildEvaluationMatrixDataGridSx } from "../../shared/styles/evaluationMatrixTable.styles";
import { isPlainObject } from "../../../../../utils/common/objects";
import { alternativeCriteriaMatrixViewSx } from "./styles/AlternativeCriteriaMatrixView.styles";
import Cell from "./components/Cell";
import { buildColumns } from "./operations/buildColumns";
import { buildRows } from "./operations/buildRows";
import { resolveCollective } from "./operations/resolveCollective";
import { updateValue } from "./operations/updateValue";
import { validateValue } from "./operations/validateValue";

const AlternativeCriteriaMatrixView = ({
  decisionContext,
  evaluation,
  setEvaluation,
  collectiveEvaluation,
  readOnly,
}) => {
  const theme = useTheme();
  const alternatives = decisionContext.alternatives;
  const criteria = decisionContext.leafCriteria;
  const hasEvaluation =
    evaluation !== null &&
    typeof evaluation === "object" &&
    !Array.isArray(evaluation);
  const permitEdit = readOnly !== true;

  const matrixRows = useMemo(
    () =>
      hasEvaluation
        ? buildRows({
            alternatives,
            criteria,
            evaluation,
          })
        : [],
    [alternatives, criteria, evaluation, hasEvaluation]
  );

  if (!hasEvaluation) {
    return <Alert severity="error">Evaluation payload is invalid.</Alert>;
  }

  const handleValueChange = ({ alternativeId, criterionId, nextValue }) => {
    const nextEvaluation = updateValue({
      evaluation,
      alternativeId,
      criterionId,
      nextValue,
    });

    setEvaluation(nextEvaluation);
  };

  // columns/rendering omitted here only because they are matrix-specific.

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "none",
        minWidth: 0,
        p: { xs: 1, sm: 1.5 },
        overflow: "hidden",
      }}
    >
      {/* structure-specific UI */}
    </Box>
  );
};

export default AlternativeCriteriaMatrixView;
```

The reference demonstrates:

- host props are used directly;
- complete immutable payload updates are passed to `setEvaluation`;
- structure-specific pure logic may live in `operations/`;
- structure-specific styling may live in `styles/`;
- Material UI is used instead of introducing another UI system;
- compact responsive padding is preferred.


## Exact generated starting source

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

## Creator-side initialization

```text
scaffold_creator_api_operations = true
```

When true, exact path:

```text
Frontend/src/features/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/operations/buildInitialEvaluation.js
```

Starting source:

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

Contract:

```js
buildInitialEvaluation({
  decisionContext,
}) => completeEvaluationObject
```

Use only supplied `decisionContext`.

## Package organization

Only create extra files when useful:

```text
components/   structure-specific React subcomponents
operations/   pure structure-specific logic
styles/       extracted MUI sx/style definitions
```

Do not create generic one-use helpers/services/hooks.

## Lifecycle

Keep `implementationStatus: "scaffold"` until every requested runtime/UI
behavior is complete.

Use `"ready"` when complete.

Tests are outside scope. Do not create/modify test files unless explicitly
requested.

## Required output

For every file:

```text
FILE: <complete repository path>
```

then the complete source.

No diffs, ellipses, partial components/functions, pseudocode or unfinished TODO
implementation.
