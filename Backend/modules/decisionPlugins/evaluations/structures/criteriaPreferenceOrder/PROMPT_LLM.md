# Implement criteriaPreferenceOrder Backend — Standalone LLM prompt

You are implementing the Backend of a CreteValleyDSS Evaluation Structure.

This prompt is intentionally self-contained and may be long. You do NOT need
repository access. Do not assume undocumented repository conventions.

Return complete replacement files ready to copy into the exact repository paths
defined below.

## Developer requirements

### Structure description

criteriaPreferenceOrder represents a strict ordinal preference order over the
current leaf criteria of an issue.

The issue creator or an expert ranks the current leaf criteria from most
important to least important.

This Evaluation Structure owns only that ordinal ordering.

It does NOT compute or store:

- criterion weights;
- positional scores;
- normalized utilities;
- consensus;
- MCC results;
- aggregation across experts.

Those responsibilities belong to the criteria-weighting model that consumes this
Evaluation Structure.

The canonical criterion universe comes from:

decisionContext.leafCriteria

The ordering is represented exclusively using criterion IDs.

Criterion names, explicit numeric rank values and calculated weights are not
part of this Evaluation Structure payload.

Example:

["C5", "C2", "C1", "C3"]

means:

C5 ≻ C2 ≻ C1 ≻ C3

where C5 is the most important criterion and C3 is the least important.

Array position is the rank.

Ties are not supported.

A submitted evaluation represents one strict complete ordering of all current
leaf criteria.

### Canonical evaluation payload

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

Its semantics are:

- index 0 = most important criterion;
- increasing indices = decreasing preference;
- final index = least important criterion.

The canonical source of valid criterion IDs is:

decisionContext.leafCriteria

The payload owns exactly one property:

criterionOrder

Do not preserve or introduce unrelated properties.

The payload must NOT contain:

- criterion names;
- explicit rank numbers;
- objects describing criteria;
- criterion weights;
- utility values;
- positional scores;
- Expression Domain evaluations;
- consensus information;
- MCC information;
- expert information.

Draft evaluations may contain an empty or partial criterionOrder.

Submitted evaluations must contain every current leaf criterion exactly once.

The order of criterionOrder is semantically meaningful and must always be
preserved.

### Validation rules

Validate both the application-provided canonical criterion context and the
user-controlled evaluation payload.

Canonical decisionContext rules:

- decisionContext must be a plain object;
- decisionContext.leafCriteria must exist and be an array;
- each leaf criterion must provide an id that is a non-empty string after
  trimming;
- criterion IDs from decisionContext.leafCriteria must be unique after
  normalization;
- malformed decisionContext or malformed canonical leaf criteria are application
  context failures, not user evaluation failures.

Only criterion IDs are required by this Evaluation Structure. Do not require a
criterion name merely to validate the preference-order payload.

Payload rules:

- payload must be a plain object;
- payload.criterionOrder must exist and be an array;
- every criterionOrder item must be a string;
- every criterionOrder item must be non-empty after trimming;
- criterion IDs may be normalized by trimming surrounding whitespace;
- do not coerce numbers, objects or other types into strings;
- after normalization every supplied criterion ID must correspond to a current
  criterion in decisionContext.leafCriteria;
- criterion IDs must be unique after normalization;
- unknown IDs are invalid;
- duplicate IDs are invalid;
- order must be preserved exactly;
- ties are not represented or supported.

Draft mode:

- criterionOrder may be empty;
- criterionOrder may contain any partial ordered subset of the current leaf
  criteria;
- every supplied ID must still be valid and unique;
- draft validation must not insert criteria that have not yet been ranked.

Submit mode:

- criterionOrder must contain exactly the complete set of current leaf criterion
  IDs;
- every current leaf criterion must appear exactly once;
- no current criterion may be missing;
- no additional/unknown criterion may appear;
- for N current leaf criteria, criterionOrder.length must equal N.

Normalization rules:

- return a fresh canonical payload object;
- normalize criterion IDs only by the explicitly allowed string trimming;
- never sort criterionOrder;
- never infer a different rank;
- never reorder the user's selection;
- never add missing criteria automatically;
- never silently remove duplicate or unknown criteria;
- never convert criterion names into criterion IDs;
- never add calculated weights, scores or ranks.

Expression Domain validation does not apply to this structure because
criterionOrder ranks the criteria themselves. It does not contain values
evaluated against criterion.expressionDomain.

### Additional requirements

Keep the implementation intentionally small and focused on the canonical
preference-order payload.

GET behavior:

When payload is null or undefined:

- first validate the canonical decisionContext required by this structure;
- return exactly:

  {
    "criterionOrder": []
  }

When a stored payload exists:

- validate and normalize it using draft semantics because persisted data may be
  an incomplete draft;
- return exactly:

  {
    "criterionOrder": [...]
  }

- do not preserve unrelated stored properties;
- do not calculate criterion weights or scores;
- do not reorder criterionOrder.

SAVE behavior:

- resolve and enforce the supplied mode;
- draft uses the draft rules defined above;
- submit uses the definitive complete-order rules defined above;
- return exactly:

  {
    "criterionOrder": [...]
  }

- do not mutate payload or decisionContext;
- discard unrelated payload properties from the normalized stored result;
- preserve the semantic ordering exactly.

Recommended structure-specific separation:

It is acceptable and preferable when it keeps the implementation clear to use
small pure operations such as:

- operations/resolveCriteria.js
- operations/validatePayload.js or operations/normalizePayload.js

Do not create them if equivalent logic remains clearer without them.

Creator-side criterion remapping:

The generated operations/remapCriterionIds.js must be fully implemented.

This Evaluation Structure owns criterion references only inside:

payload.criterionOrder

For each criterion ID in criterionOrder:

- validate the source ID as a non-empty string;
- normalize it by trimming;
- require a mapping in criterionIdMap;
- validate the mapped persisted ID as a non-empty string;
- preserve the original array order.

The output must be a fresh canonical object exactly shaped as:

{
  "criterionOrder": [...]
}

If two different source criterion IDs map to the same persisted criterion ID,
reject the remapped payload because the resulting preference order would contain
a duplicate criterion.

Do not perform recursive replacement.

Do not inspect or remap arbitrary strings elsewhere in the payload.

Do not implement any preference-order-to-weight mathematics in this Evaluation
Structure.

Specifically, do NOT implement here:

- ordinal rank to positional-score conversion;
- positional-score normalization;
- utility calculation;
- criteria weight calculation;
- single-expert weight resolution;
- multi-expert aggregation;
- MCC;
- consensus.

Those responsibilities belong to the DecisionModelsService model:

preference_order_criteria_weights

The Backend Evaluation Structure is complete when:

- canonical context validation is implemented;
- GET is implemented;
- draft SAVE is implemented;
- submit SAVE is implemented;
- canonical normalization is implemented;
- creator-side criterion-ID remapping is implemented;
- every returned/stored payload respects the exact canonical shape.

When all of those runtime behaviors are implemented, set:

implementationStatus: "ready"

### Actual runtime input — optional

Not available yet.

Use the contracts and representative decisionContext supplied by this prompt.

Do not invent additional decisionContext fields.

Do not depend on the representative example IDs or names.

The implementation must work dynamically with the actual
decisionContext.leafCriteria supplied at runtime.

If runtime input is supplied, its object shape is authoritative where it differs
from the representative examples.

## Exact generated package location

This Evaluation Structure lives exactly at:

```text
Backend/modules/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/
```

Generated/runtime files therefore use these complete paths:

```text
Backend/modules/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/index.js
Backend/modules/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/criteriaPreferenceOrder.get.js
Backend/modules/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/criteriaPreferenceOrder.save.js
```

When creator-side criterion remapping is generated:

```text
Backend/modules/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/operations/remapCriterionIds.js
```

Do not invent another location.

### Relative import facts from this package

From a JS file directly in the structure root:

```js
import { createBadRequestError, createInternalError } from "../../../../../utils/common/errors.js";
import { isPlainObject, hasOwnKey } from "../../../../../utils/common/objects.js";
import { normalizeNonEmptyString, isNonEmptyString } from "../../../../../utils/common/strings.js";
import { resolveRequireValue } from "../../shared/resolveRequireValue.js";
```

Use only imports actually needed by each file.

From a JS file inside this structure's `operations/` directory, shared Backend
utilities are one directory farther away:

```js
import { createBadRequestError, createInternalError } from "../../../../../../utils/common/errors.js";
import { isPlainObject, hasOwnKey } from "../../../../../../utils/common/objects.js";
import { normalizeNonEmptyString, isNonEmptyString } from "../../../../../../utils/common/strings.js";
```

These relative paths are part of the integration contract.

## Architecture

CreteValleyDSS uses plugin-owned Evaluation Structures.

Evaluation payloads are stored using Mongoose `Schema.Types.Mixed`; there is no
universal database shape.

Each structure owns:

- canonical payload shape;
- structure-specific validation;
- normalization;
- draft/submit semantics;
- structure-specific creator remapping when applicable.

Do not change shared persistence schemas.


## Exact shared Backend contracts

The following repository modules already exist. Their public contracts are part
of this standalone prompt.

### `Backend/utils/common/errors.js`

```js
export class AppError extends Error {
  constructor(
    message,
    {
      statusCode = 500,
      code = "INTERNAL_ERROR",
      field = null,
      details = null,
      expose = true,
      cause = null,
    } = {}
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.field = field;
    this.details = details;
    this.expose = expose;
    this.cause = cause;

    Error.captureStackTrace?.(this, AppError);
  }
}

export const isAppError = (error) => error instanceof AppError;

const buildErrorFactory =
  (statusCode, code) =>
  (message, options = {}) =>
    new AppError(message, {
      statusCode,
      code,
      ...options,
    });

export const createBadRequestError = buildErrorFactory(400, "BAD_REQUEST");
export const createUnauthorizedError = buildErrorFactory(401, "UNAUTHORIZED");
export const createForbiddenError = buildErrorFactory(403, "FORBIDDEN");
export const createNotFoundError = buildErrorFactory(404, "NOT_FOUND");
export const createConflictError = buildErrorFactory(409, "CONFLICT");
export const createInternalError = buildErrorFactory(500, "INTERNAL_ERROR");
```

Use `createBadRequestError(...)` for invalid user-controlled or persisted
evaluation input.

Use `createInternalError(...)` when application-provided canonical/runtime
context is malformed or inconsistent.

Do not throw plain `Error` or `TypeError` for those known conditions.

### `Backend/utils/common/objects.js`

```js
export const isPlainObject = (value) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};

export const hasOwnKey = (object, key) =>
  Object.prototype.hasOwnProperty.call(object, key);
```

### `Backend/utils/common/strings.js`

Relevant existing APIs:

```js
export const normalizeNonEmptyString = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const isNonEmptyString = (value) =>
  normalizeString(value).length > 0;
```

`normalizeNonEmptyString` is strict about the original value being a string.

Prefer existing shared helpers when their semantics match instead of creating a
local generic equivalent.



### Draft/submit helper

`Backend/modules/decisionPlugins/evaluations/shared/resolveRequireValue.js`
already contains:

```js
import { createBadRequestError } from "../../../../utils/common/errors.js";

const EVALUATION_SAVE_MODES = Object.freeze({
  DRAFT: "draft",
  SUBMIT: "submit",
});

export const resolveRequireValue = (mode) => {
  if (mode === EVALUATION_SAVE_MODES.DRAFT) {
    return false;
  }

  if (mode === EVALUATION_SAVE_MODES.SUBMIT) {
    return true;
  }

  throw createBadRequestError("Unsupported evaluation save mode", {
    field: "mode",
  });
};
```

Use `resolveRequireValue(mode)` when the structure's draft/submit distinction can
be represented by a simple `requireValue` boolean.

Do not force it if the supplied structure requirements define more specific
mode semantics.


## Public Evaluation Structure contract

GET:

```js
async ({
  payload,
  decisionContext,
}) => frontendPayload
```

`payload` is the stored evaluation payload or `null`/`undefined`.

GET returns the complete canonical payload consumed by the Frontend.

SAVE:

```js
async ({
  payload,
  decisionContext,
  mode,
}) => storedPayload
```

`mode` is exactly `"draft"` or `"submit"`.

SAVE validates and returns a complete normalized canonical payload.

Do not mutate input `payload` or `decisionContext`.

## Representative decisionContext

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
    { "id": "ALT_1", "name": "Supplier A" },
    { "id": "ALT_2", "name": "Supplier B" }
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
}
```

Concrete values vary. Do not hard-code example IDs/names.

Use already supplied `decisionContext`; do not add queries or API calls for data
already present there.

## Expression Domain integration

If this structure stores values evaluated against
`criterion.expressionDomain`, use the canonical domain from `decisionContext`.

The existing shared Backend helper module is:

```text
Backend/modules/decisionPlugins/evaluations/shared/expressionDomainEvaluationPayload.js
```

It wraps the registered Expression Domain validator.

The lower-level validation boundary is:

```js
validateExpressionDomainEvaluationOrThrow({
  value,
  expressionDomain,
});
```

Do not recreate numeric continuous/discrete, linguistic ordinal, fuzzy,
linguistic 2-tuple or other registered domain-specific validation.

If this structure does not store Expression Domain evaluation values, do not
force Expression Domain logic into it.

## Exact generated starting source

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

## Creator-side criterion remapping

For this scaffold:

```text
scaffold_creator_api_operations = true
```

When true, the exact generated file path is:

```text
Backend/modules/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/operations/remapCriterionIds.js
```

Its starting source is:

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

`criterionIdMap` is exactly a JavaScript:

```text
Map<temporaryCriterionId, persistedCriterionId>
```

Required representation:

```js
criterionIdMap instanceof Map
criterionIdMap.has(sourceCriterionId)
criterionIdMap.get(sourceCriterionId)
```

Do not treat it as an object, array of pairs or any other representation.

Remap ONLY criterion references owned by the canonical payload.

Do not perform generic recursive string replacement.

Malformed remapping payload/map/source/mapped values are invalid Backend input
and use `createBadRequestError(...)`.


## Reference implementation from an existing Evaluation Structure

The following code is provided ONLY to show current CreteValleyDSS Backend
conventions. It is not the payload specification for the new structure. Do not
copy BWM-specific domain rules unless the developer requirements explicitly ask
for them.

### Existing GET pattern

```js
import { buildEmptyPayload } from "./operations/buildEmptyPayload.js";
import { normalizePayload } from "./operations/normalizePayload.js";
import { resolveCriteria } from "./operations/resolveCriteria.js";

export const getBestWorstCriteriaPayload = async ({
  payload,
  decisionContext,
}) => {
  if (payload === null || payload === undefined) {
    const criteria = resolveCriteria({ decisionContext });
    return buildEmptyPayload({ criteria });
  }

  return normalizePayload({
    payload,
    decisionContext,
    requireValue: false,
  });
};
```

### Existing SAVE pattern

```js
import { resolveRequireValue } from "../../shared/resolveRequireValue.js";
import { normalizePayload } from "./operations/normalizePayload.js";

export const saveBestWorstCriteriaPayload = async ({
  payload,
  decisionContext,
  mode,
}) => {
  const requireValue = resolveRequireValue(mode);

  return normalizePayload({
    payload,
    decisionContext,
    requireValue,
  });
};
```

### Existing canonical-context validation pattern

```js
import { createInternalError } from "../../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../../utils/common/objects.js";

export const resolveCriteria = ({ decisionContext }) => {
  if (!isPlainObject(decisionContext)) {
    throw createInternalError("Evaluation structure context is invalid", {
      field: "decisionContext",
    });
  }

  const sourceCriteria = decisionContext.leafCriteria;

  if (!Array.isArray(sourceCriteria)) {
    throw createInternalError(
      "Evaluation structure context leafCriteria must be an array",
      {
        field: "decisionContext.leafCriteria",
      }
    );
  }

  const seenIds = new Set();

  return sourceCriteria.map((criterion, index) => {
    const id = typeof criterion?.id === "string" ? criterion.id.trim() : "";
    const name =
      typeof criterion?.name === "string" ? criterion.name.trim() : "";

    if (!id) {
      throw createInternalError("Evaluation structure criterion id is invalid", {
        field: `decisionContext.leafCriteria[${index}].id`,
      });
    }

    if (!name) {
      throw createInternalError(
        "Evaluation structure criterion name is invalid",
        {
          field: `decisionContext.leafCriteria[${index}].name`,
        }
      );
    }

    if (seenIds.has(id)) {
      throw createInternalError(
        "Evaluation structure criterion ids must be unique",
        {
          field: `decisionContext.leafCriteria[${index}].id`,
        }
      );
    }

    seenIds.add(id);

    return { id, name, index };
  });
};
```

### Existing creator criterion-remapping pattern

```js
import { createBadRequestError } from "../../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../../utils/common/objects.js";
import { normalizeNonEmptyString } from "../../../../../../utils/common/strings.js";

const remapCriterionIdOrThrow = ({ criterionId, criterionIdMap, field }) => {
  const normalizedCriterionId = normalizeNonEmptyString(criterionId);
  if (!normalizedCriterionId) {
    throw createBadRequestError(
      "Criterion id is required for criteria weighting payload",
      { field }
    );
  }

  const mappedCriterionId = normalizeNonEmptyString(
    criterionIdMap.get(normalizedCriterionId)
  );

  if (!mappedCriterionId) {
    throw createBadRequestError(
      "Unable to remap criteria weighting payload to persisted criteria",
      {
        field,
        details: { criterionId: normalizedCriterionId },
      }
    );
  }

  return mappedCriterionId;
};

export const remapBestWorstCriteriaCriterionIds = ({
  payload,
  criterionIdMap,
}) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError(
      "criteriaWeightingConfig.payload must be an object",
      {
        field: "criteriaWeightingConfig.payload",
      }
    );
  }

  if (!(criterionIdMap instanceof Map)) {
    throw createBadRequestError("criterionIdMap must be a Map", {
      field: "criterionIdMap",
    });
  }

  // BWM then remaps only its own criterion references.
};
```

Important lessons from the reference:

- expected evaluation/remapping failures use `createBadRequestError`;
- malformed canonical context uses `createInternalError`;
- shared helpers are imported rather than recreated;
- operation files one level below the structure root use one additional `../`;
- normalization returns a fresh canonical object;
- payload-specific logic remains inside the structure package.


## Implementation style

Follow these rules:

- ES modules;
- preserve generated public exports/signatures;
- prefer existing shared helpers;
- use application errors rather than plain errors for known validation/context
  failures;
- normalize into fresh canonical objects;
- do not mutate caller-owned data;
- preserve semantic array ordering when the payload defines an order;
- keep structure-specific pure operations in `operations/` when useful;
- descriptive operation filenames;
- no generic `utils/`, `helpers/`, `services/` or adapters for one local use;
- no compatibility aliases, legacy payloads or broad coercion unless required
  by the explicit contract;
- no new dependency unless necessary.

## Lifecycle

The generated registry starts with:

```js
implementationStatus: "scaffold"
```

Change to `"ready"` only when every runtime behavior required by this prompt is
implemented.

Tests are intentionally outside this generated prompt.

Do not create or modify test files unless the developer explicitly requests
tests.

If information required for runtime implementation is genuinely missing, do
not guess. Keep `"scaffold"` and state exactly what is missing.

## Required output

Return every file that must be created or replaced.

For every file write:

```text
FILE: <complete repository path>
```

followed immediately by one fenced block containing the COMPLETE file.

Do not return:

- diffs;
- ellipses;
- partial implementations;
- pseudocode;
- TODO implementations presented as finished;
- invented files that are not useful.

At minimum return every generated runtime file that needs replacement.
