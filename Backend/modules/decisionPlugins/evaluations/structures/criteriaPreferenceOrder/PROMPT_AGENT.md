# Implement criteriaPreferenceOrder Backend — Agent prompt

You are a repository-aware coding agent inside CreteValleyDSS.

The target package is exactly:

```text
Backend/modules/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/
```

## Read first

Read the complete generated package and `IMPLEMENTATION_GUIDE.md`.

Also read:

```text
Backend/utils/common/errors.js
Backend/utils/common/objects.js
Backend/utils/common/strings.js
Backend/modules/decisionPlugins/evaluations/shared/resolveRequireValue.js
Backend/modules/decisionPlugins/evaluations/shared/expressionDomainEvaluationPayload.js
```

Inspect the closest relevant existing Evaluation Structure. The current
repository is authoritative.

## Developer requirements

### Structure description
[STRUCTURE DESCRIPTION]

### Canonical evaluation payload
[EVALUATION PAYLOAD DESCRIPTION]

### Validation rules
[VALIDATION RULES]

### Additional requirements
[ADDITIONAL REQUIREMENTS]

### Actual runtime input — optional
[ACTUAL RUNTIME INPUT]


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


## Public contract

Preserve:

```js
async ({ payload, decisionContext }) => frontendPayload
async ({ payload, decisionContext, mode }) => storedPayload
```

Do not mutate inputs. Use `decisionContext` rather than refetching data.

## Creator remapping

If `operations/remapCriterionIds.js` exists, `criterionIdMap` is exactly:

```text
Map<temporaryCriterionId, persistedCriterionId>
```

Use `Map.has/get`. Remap only payload-owned criterion references.


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


## Scope and style

Use repository conventions, ES modules, shared errors/helpers and local pure
operations. Do not create compatibility fallbacks or unrelated abstractions.

Do not modify shared persistence schemas, unrelated Evaluation Structures,
decisionContext builders, Expression Domain implementations, Frontend,
ModelForge templates/UI or DecisionModelsService unless explicitly requested.

## Lifecycle/validation

Mark `"ready"` when all requested runtime behavior is implemented.

Tests are outside scope. Do not create/modify/run tests unless explicitly
requested.

Run appropriate targeted lint/static checks and:

```text
git diff --check
```

Do not install dependencies.

## Final report

Report files changed, canonical payload, draft/submit behavior, error/helper
reuse, Expression Domain/remap behavior, lifecycle status, validation commands
and any limitation. Do not paste every source file.
