         
import { Alternative } from "../../models/Alternatives.js";
import { CriteriaWeightEvaluation } from "../../models/CriteriaWeightEvaluation.js";
import { Criterion } from "../../models/Criteria.js";
import { Evaluation } from "../../models/Evaluations.js";
import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import { Issue } from "../../models/Issues.js";
import { IssueModel } from "../../models/IssueModels.js";
import { Notification } from "../../models/Notificacions.js";
import { Participation } from "../../models/Participations.js";
import { User } from "../../models/Users.js";

          
import {
  EVALUATION_STRUCTURES,
  validateEvaluationStructureOrThrow,
} from "./issue.evaluationStructure.js";
import {
  LIFECYCLE_KINDS,
  isSupportedLifecycleKind,
} from "./issue.lifecycleKind.js";
import { buildInitialAlternativeEvaluationDocs } from "./alternativeEvaluations/index.js";
import {
  buildInitialCriteriaWeightEvaluationDocs,
  resolveInitialIssueStage,
} from "./weightEvaluations/weightEvaluation.initialDocs.js";
import { normalizeSingleWeight } from "./weightEvaluations/weightEvaluation.shared.js";
import { createIssueDomainSnapshots } from "./issue.domainSnapshots.js";
import { validateAndNormalizeModelParametersOrThrow as validateAndNormalizeModelParametersSharedOrThrow } from "./modelParameters/modelParameters.validation.js";

        
import { compareNameId } from "../../modules/issues/issue.ordering.js";
import {
  getUniqueTrimmedStrings,
  normalizeEmail,
  normalizeOptionalString,
  normalizeString,
} from "../../utils/common/strings.js";
import { toIdString } from "../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../utils/common/mongoose.js";
import {
  createBadRequestError,
  createConflictError,
  createNotFoundError,
} from "../../utils/common/errors.js";

                     
import dayjs from "dayjs";

const SUPPORTED_EVALUATION_STRUCTURES = new Set(
  Object.values(EVALUATION_STRUCTURES)
);

const SUPPORTED_INPUT_KINDS = new Set([
  "directCrispMatrix",
  "directFuzzyMatrix",
  "pairwisePreferenceMatrix",
]);

const SUPPORTED_OUTPUT_KINDS = new Set([
  "ranking",
  "consensusRanking",
]);

const CONSENSUS_OUTPUT_KIND = "consensusRanking";
const SINGLE_PASS_OUTPUT_KIND = "ranking";

const hasOwn = (value, key) =>
  Object.prototype.hasOwnProperty.call(value || {}, key);

const normalizeNonEmptyString = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeEndpointPath = (value) => {
  const path = normalizeNonEmptyString(value);
  if (!path) {
    return null;
  }

  const normalizedPath = path.replace(/^\/+|\/+$/g, "");
  return normalizedPath ? `/${normalizedPath}` : null;
};

const normalizeApiModelKey = (value) => {
  const key = normalizeNonEmptyString(value);
  if (!key) {
    return null;
  }

  const normalizedKey = key.replace(/^\/+|\/+$/g, "");
  return normalizedKey || null;
};

const validateIssueModelRuntimeConfigOrThrow = (model) => {
  const modelName = normalizeNonEmptyString(model?.name) || "unknown";
  const runtimeErrors = [];

  const apiModelKey = normalizeApiModelKey(model?.apiModelKey);
  if (!apiModelKey) {
    runtimeErrors.push({
      field: "apiModelKey",
      message: "must be a non-empty string",
      value: model?.apiModelKey,
    });
  }

  const endpointPath = normalizeEndpointPath(model?.apiEndpoint?.path);
  if (!endpointPath) {
    runtimeErrors.push({
      field: "apiEndpoint.path",
      message: "must be a non-empty string",
      value: model?.apiEndpoint?.path,
    });
  }

  const evaluationStructure = normalizeNonEmptyString(model?.evaluationStructure);
  if (!evaluationStructure) {
    runtimeErrors.push({
      field: "evaluationStructure",
      message: "is required",
      value: model?.evaluationStructure,
    });
  } else if (!SUPPORTED_EVALUATION_STRUCTURES.has(evaluationStructure)) {
    runtimeErrors.push({
      field: "evaluationStructure",
      message: `is unsupported: ${evaluationStructure}`,
      value: model?.evaluationStructure,
    });
  }

  const lifecycleKind = normalizeNonEmptyString(model?.lifecycleKind);
  if (!lifecycleKind) {
    runtimeErrors.push({
      field: "lifecycleKind",
      message: "is required",
      value: model?.lifecycleKind,
    });
  } else if (!isSupportedLifecycleKind(lifecycleKind)) {
    runtimeErrors.push({
      field: "lifecycleKind",
      message: `is unsupported: ${lifecycleKind}`,
      value: model?.lifecycleKind,
    });
  }

  const inputKind = normalizeNonEmptyString(model?.inputKind);
  if (!inputKind) {
    runtimeErrors.push({
      field: "inputKind",
      message: "is required",
      value: model?.inputKind,
    });
  } else if (!SUPPORTED_INPUT_KINDS.has(inputKind)) {
    runtimeErrors.push({
      field: "inputKind",
      message: `is unsupported: ${inputKind}`,
      value: model?.inputKind,
    });
  }

  const outputKind = normalizeNonEmptyString(model?.outputKind);
  if (!outputKind) {
    runtimeErrors.push({
      field: "outputKind",
      message: "is required",
      value: model?.outputKind,
    });
  } else if (!SUPPORTED_OUTPUT_KINDS.has(outputKind)) {
    runtimeErrors.push({
      field: "outputKind",
      message: `is unsupported: ${outputKind}`,
      value: model?.outputKind,
    });
  }

  if (typeof model?.isConsensus !== "boolean") {
    runtimeErrors.push({
      field: "isConsensus",
      message: "must be a boolean",
      value: model?.isConsensus,
    });
  }

  const modelFamilyKey = normalizeNonEmptyString(model?.modelFamilyKey);
  if (!modelFamilyKey) {
    runtimeErrors.push({
      field: "modelFamilyKey",
      message: "must be a non-empty string",
      value: model?.modelFamilyKey,
    });
  }

  const modelVersion = normalizeNonEmptyString(model?.modelVersion);
  if (!modelVersion) {
    runtimeErrors.push({
      field: "modelVersion",
      message: "must be a non-empty string",
      value: model?.modelVersion,
    });
  }

  const versionLabel = normalizeNonEmptyString(model?.versionLabel);
  if (!versionLabel) {
    runtimeErrors.push({
      field: "versionLabel",
      message: "must be a non-empty string",
      value: model?.versionLabel,
    });
  }

  if (runtimeErrors.length > 0) {
    const firstError = runtimeErrors[0];
    const fieldSummary = runtimeErrors
      .map((error) => `${error.field} ${error.message}`)
      .join(", ");

    throw createBadRequestError(
      `Selected model '${modelName}' is missing required runtime configuration: ${fieldSummary}`,
      {
        field: `selectedModel.${firstError.field}`,
        details: {
          model: modelName,
          missingOrInvalidFields: runtimeErrors,
        },
      }
    );
  }

  return {
    apiModelKey,
    apiEndpoint: {
      method: normalizeNonEmptyString(model?.apiEndpoint?.method) || null,
      path: endpointPath,
      operationId: normalizeNonEmptyString(model?.apiEndpoint?.operationId) || null,
    },
    inputKind,
    outputKind,
    evaluationStructure: validateEvaluationStructureOrThrow(evaluationStructure),
    lifecycleKind,
    modelFamilyKey,
    modelVersion,
    versionLabel,
  };
};

const validateIssueConsensusCompatibilityOrThrow = ({
  requestedWithConsensus,
  model,
  lifecycleKind,
}) => {
  const modelName = normalizeNonEmptyString(model?.name) || "unknown";
  const modelIsConsensus = model?.isConsensus;
  const outputKind = normalizeNonEmptyString(model?.outputKind);
  const normalizedLifecycleKind = normalizeNonEmptyString(lifecycleKind);
  const incompatibilities = [];

  if (requestedWithConsensus !== modelIsConsensus) {
    incompatibilities.push(
      `withConsensus (${requestedWithConsensus}) must match model.isConsensus (${modelIsConsensus})`
    );
  }

  if (modelIsConsensus) {
    if (normalizedLifecycleKind !== LIFECYCLE_KINDS.THRESHOLD_CONSENSUS) {
      incompatibilities.push(
        `consensus model requires lifecycleKind '${LIFECYCLE_KINDS.THRESHOLD_CONSENSUS}'`
      );
    }

    if (outputKind !== CONSENSUS_OUTPUT_KIND) {
      incompatibilities.push(
        `consensus model requires outputKind '${CONSENSUS_OUTPUT_KIND}'`
      );
    }
  } else {
    if (normalizedLifecycleKind !== LIFECYCLE_KINDS.SINGLE_PASS) {
      incompatibilities.push(
        `non-consensus model requires lifecycleKind '${LIFECYCLE_KINDS.SINGLE_PASS}'`
      );
    }

    if (outputKind !== SINGLE_PASS_OUTPUT_KIND) {
      incompatibilities.push(
        `non-consensus model requires outputKind '${SINGLE_PASS_OUTPUT_KIND}'`
      );
    }
  }

  if (incompatibilities.length > 0) {
    throw createBadRequestError(
      `Requested consensus mode is incompatible with selected model '${modelName}': ${incompatibilities.join(", ")}`,
      {
        field: "withConsensus",
        details: {
          requestedWithConsensus,
          modelIsConsensus,
          outputKind: outputKind ?? null,
          lifecycleKind: normalizedLifecycleKind ?? null,
          incompatibilities,
        },
      }
    );
  }
};

const getValueType = (value) => {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
};

const SUPPORTED_PARAMETER_TYPES = new Set([
  "number",
  "integer",
  "boolean",
  "string",
  "enum",
  "array",
  "interval",
  "tuple",
  "fuzzyNumber",
  "fuzzyArray",
]);

const SUPPORTED_PARAMETER_ORDERED_RULES = new Set([
  "strictIncreasing",
  "nonDecreasing",
]);

const resolveParameterKey = (parameter) => {
  return (
    normalizeNonEmptyString(parameter?.key) ||
    normalizeNonEmptyString(parameter?.name)
  );
};

const isMissingParameterValue = (value) =>
  value === undefined || value === null || value === "";

const valuesAreEqual = (left, right) => {
  if (typeof left === "number" && typeof right === "number") {
    return Object.is(left, right);
  }

  return JSON.stringify(left) === JSON.stringify(right);
};

const isAllowedValue = (value, allowed) => {
  if (!Array.isArray(allowed) || allowed.length === 0) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) =>
      allowed.some((allowedItem) => valuesAreEqual(item, allowedItem))
    );
  }

  return allowed.some((allowedItem) => valuesAreEqual(value, allowedItem));
};

const normalizeNumberValue = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const resolveExpectedArrayLength = (parameter, leafCriteriaCount) => {
  const configuredLength = parameter?.restrictions?.length;

  if (configuredLength === "matchCriteria") {
    return leafCriteriaCount;
  }

  if (configuredLength === "matchAlternatives") {
    return null;
  }

  if (typeof configuredLength === "number" && Number.isInteger(configuredLength)) {
    return configuredLength;
  }

  if (Array.isArray(parameter?.default)) {
    return parameter.default.length;
  }

  return null;
};

const isWithinRange = (value, restrictions = {}) => {
  if (typeof restrictions.min === "number" && value < restrictions.min) {
    return false;
  }

  if (typeof restrictions.max === "number" && value > restrictions.max) {
    return false;
  }

  return true;
};

const validateOrderedRule = (values, orderedRule) => {
  if (!orderedRule || values.length < 2) {
    return true;
  }

  if (orderedRule === "strictIncreasing") {
    for (let index = 1; index < values.length; index += 1) {
      if (!(values[index - 1] < values[index])) {
        return false;
      }
    }
    return true;
  }

  if (orderedRule === "nonDecreasing") {
    for (let index = 1; index < values.length; index += 1) {
      if (!(values[index - 1] <= values[index])) {
        return false;
      }
    }
    return true;
  }

  return false;
};

const countLeafCriteriaNodes = (nodes) => {
  if (!Array.isArray(nodes)) {
    return 0;
  }

  return nodes.reduce((count, node) => {
    const children = Array.isArray(node?.children) ? node.children : [];
    if (children.length === 0) {
      return count + 1;
    }

    return count + countLeafCriteriaNodes(children);
  }, 0);
};

const modelRequiresCriterionWeights = (model) => {
  const parameters = Array.isArray(model?.parameters) ? model.parameters : [];

  return parameters.some((parameter) => {
    const parameterName = resolveParameterKey(parameter);
    const parameterType = normalizeNonEmptyString(parameter?.type);
    const lengthRestriction = parameter?.restrictions?.length;

    return (
      parameterName === "weights" &&
      parameterType === "array" &&
      lengthRestriction === "matchCriteria"
    );
  });
};

const isCriterionWeightsParameter = ({ parameterName, parameter, restrictions }) => {
  if (parameterName !== "weights") {
    return false;
  }

  return (
    normalizeNonEmptyString(parameter?.type) === "array" &&
    restrictions?.length === "matchCriteria"
  );
};

const buildInvalidParameterError = ({
  modelName,
  parameterErrors,
}) => {
  const firstError = parameterErrors[0];
  const summary = parameterErrors
    .map((error) => `${error.parameter} ${error.message}`)
    .join(", ");

  throw createBadRequestError(
    `Invalid model parameters for model '${modelName}': ${summary}`,
    {
      field: `paramValues.${firstError.parameter}`,
      details: {
        model: modelName,
        invalidParameters: parameterErrors,
      },
    }
  );
};

const validateAndNormalizeModelParametersOrThrow = ({
  model,
  paramValues,
  criteriaNodes,
}) => {
  const modelName = normalizeNonEmptyString(model?.name) || "unknown";
  const modelParameters = Array.isArray(model?.parameters) ? model.parameters : [];
  const leafCriteriaCount = countLeafCriteriaNodes(criteriaNodes);
  const rawParamValues =
    paramValues && typeof paramValues === "object" && !Array.isArray(paramValues)
      ? paramValues
      : null;

  if (!rawParamValues) {
    throw createBadRequestError("paramValues must be an object", {
      field: "paramValues",
    });
  }

  const parameterByName = new Map();
  for (const parameter of modelParameters) {
    const parameterName = resolveParameterKey(parameter);
    if (parameterName) {
      parameterByName.set(parameterName, parameter);
    }
  }

  const unknownParameters = Object.keys(rawParamValues).filter(
    (parameterName) => !parameterByName.has(parameterName)
  );

  if (unknownParameters.length > 0) {
    throw createBadRequestError(
      `Unknown model parameters for model '${modelName}': ${unknownParameters.join(", ")}`,
      {
        field: `paramValues.${unknownParameters[0]}`,
        details: {
          model: modelName,
          unknownParameters,
          allowedParameters: Array.from(parameterByName.keys()),
        },
      }
    );
  }

  const normalizedModelParameters = {};
  const parameterErrors = [];

  const addError = ({ parameter, message, value }) => {
    parameterErrors.push({
      parameter,
      message,
      receivedType: getValueType(value),
      receivedValue: value ?? null,
    });
  };

  for (const [parameterName, parameter] of parameterByName.entries()) {
    const parameterType = normalizeNonEmptyString(parameter?.type);
    const normalizedParameterType = parameterType;
    const restrictions = parameter?.restrictions || {};
    const isRequired = parameter?.required === true;
    const hasProvidedValue = hasOwn(rawParamValues, parameterName);
    const defaultValue = parameter?.default;
    let value = hasProvidedValue ? rawParamValues[parameterName] : undefined;

    if (isMissingParameterValue(value)) {
      if (defaultValue !== undefined) {
        value = defaultValue;
      } else if (isRequired) {
        addError({
          parameter: parameterName,
          message: "is required",
          value,
        });
      } else if (hasProvidedValue) {
        addError({
          parameter: parameterName,
          message: "cannot be empty",
          value,
        });
      }

      if (isMissingParameterValue(value)) {
        continue;
      }
    }

    if (!SUPPORTED_PARAMETER_TYPES.has(String(parameterType || ""))) {
      addError({
        parameter: parameterName,
        message: `uses unsupported type '${String(parameterType || "unknown")}'`,
        value,
      });
      continue;
    }

    if (normalizedParameterType === "number" || normalizedParameterType === "integer") {
      const normalizedNumber = normalizeNumberValue(value);

      if (normalizedNumber === null) {
        addError({
          parameter: parameterName,
          message: "must be a finite number",
          value,
        });
        continue;
      }

      if (
        normalizedParameterType === "integer" &&
        !Number.isInteger(normalizedNumber)
      ) {
        addError({
          parameter: parameterName,
          message: "must be an integer",
          value,
        });
        continue;
      }

      if (!isWithinRange(normalizedNumber, restrictions)) {
        addError({
          parameter: parameterName,
          message: `must be between ${restrictions.min ?? "-∞"} and ${restrictions.max ?? "+∞"}`,
          value,
        });
        continue;
      }

      if (!isAllowedValue(normalizedNumber, restrictions.allowed)) {
        addError({
          parameter: parameterName,
          message: "contains a value outside allowed options",
          value,
        });
        continue;
      }

      normalizedModelParameters[parameterName] = normalizedNumber;
      continue;
    }

    if (normalizedParameterType === "enum") {
      if (!isAllowedValue(value, restrictions.allowed)) {
        addError({
          parameter: parameterName,
          message: "must be one of the allowed enum values",
          value,
        });
        continue;
      }

      normalizedModelParameters[parameterName] = value;
      continue;
    }

    if (normalizedParameterType === "string") {
      if (typeof value !== "string") {
        addError({
          parameter: parameterName,
          message: "must be a string",
          value,
        });
        continue;
      }

      const normalizedString = value.trim();
      if (!isAllowedValue(normalizedString, restrictions.allowed)) {
        addError({
          parameter: parameterName,
          message: "contains a value outside allowed options",
          value,
        });
        continue;
      }

      normalizedModelParameters[parameterName] = normalizedString;
      continue;
    }

    if (normalizedParameterType === "boolean") {
      let normalizedBoolean = null;

      if (typeof value === "boolean") {
        normalizedBoolean = value;
      } else if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true") normalizedBoolean = true;
        if (normalized === "false") normalizedBoolean = false;
      }

      if (normalizedBoolean === null) {
        addError({
          parameter: parameterName,
          message: "must be a boolean",
          value,
        });
        continue;
      }

      if (!isAllowedValue(normalizedBoolean, restrictions.allowed)) {
        addError({
          parameter: parameterName,
          message: "contains a value outside allowed options",
          value,
        });
        continue;
      }

      normalizedModelParameters[parameterName] = normalizedBoolean;
      continue;
    }

    if (normalizedParameterType === "interval") {
      if (!Array.isArray(value) || value.length !== 2) {
        addError({
          parameter: parameterName,
          message: "must be an array of exactly 2 numeric values",
          value,
        });
        continue;
      }

      const normalizedInterval = value.map((item) => normalizeNumberValue(item));
      if (normalizedInterval.some((item) => item === null)) {
        addError({
          parameter: parameterName,
          message: "must contain finite numeric values",
          value,
        });
        continue;
      }

      if (normalizedInterval.some((item) => !isWithinRange(item, restrictions))) {
        addError({
          parameter: parameterName,
          message: `must be between ${restrictions.min ?? "-∞"} and ${restrictions.max ?? "+∞"}`,
          value,
        });
        continue;
      }

      if (
        restrictions.ordered &&
        !validateOrderedRule(normalizedInterval, restrictions.ordered)
      ) {
        addError({
          parameter: parameterName,
          message: `must satisfy ordered rule '${restrictions.ordered}'`,
          value,
        });
        continue;
      }

      normalizedModelParameters[parameterName] = normalizedInterval;
      continue;
    }

    if (normalizedParameterType === "tuple" || normalizedParameterType === "fuzzyNumber") {
      if (!Array.isArray(value)) {
        addError({
          parameter: parameterName,
          message: "must be an array",
          value,
        });
        continue;
      }

      const expectedTupleLength =
        normalizedParameterType === "fuzzyNumber"
          ? 3
          : typeof restrictions.tupleLength === "number"
            ? restrictions.tupleLength
            : typeof restrictions.length === "number"
              ? restrictions.length
              : null;

      if (expectedTupleLength !== null && value.length !== expectedTupleLength) {
        addError({
          parameter: parameterName,
          message: `must contain exactly ${expectedTupleLength} values`,
          value,
        });
        continue;
      }

      const tupleItemType =
        normalizedParameterType === "fuzzyNumber"
          ? "number"
          : normalizeNonEmptyString(restrictions.itemType) || "number";
      const normalizedTuple = [];
      let tupleHasError = false;

      value.forEach((item, index) => {
        if (tupleItemType === "number" || tupleItemType === "integer") {
          const normalizedNumber = normalizeNumberValue(item);
          if (
            normalizedNumber === null ||
            (tupleItemType === "integer" && !Number.isInteger(normalizedNumber))
          ) {
            tupleHasError = true;
            addError({
              parameter: parameterName,
              message: `[${index}] must be a ${tupleItemType}`,
              value: item,
            });
            return;
          }

          if (!isWithinRange(normalizedNumber, restrictions)) {
            tupleHasError = true;
            addError({
              parameter: parameterName,
              message: `[${index}] must be between ${restrictions.min ?? "-∞"} and ${restrictions.max ?? "+∞"}`,
              value: item,
            });
            return;
          }

          normalizedTuple.push(normalizedNumber);
          return;
        }

        if (tupleItemType === "string") {
          if (typeof item !== "string") {
            tupleHasError = true;
            addError({
              parameter: parameterName,
              message: `[${index}] must be a string`,
              value: item,
            });
            return;
          }
          normalizedTuple.push(item.trim());
          return;
        }

        if (tupleItemType === "boolean") {
          if (typeof item !== "boolean") {
            tupleHasError = true;
            addError({
              parameter: parameterName,
              message: `[${index}] must be a boolean`,
              value: item,
            });
            return;
          }
          normalizedTuple.push(item);
          return;
        }

        tupleHasError = true;
        addError({
          parameter: parameterName,
          message: `[${index}] uses unsupported tuple itemType '${tupleItemType}'`,
          value: item,
        });
      });

      if (tupleHasError) {
        continue;
      }

      const tupleOrderedRule =
        normalizedParameterType === "fuzzyNumber"
          ? normalizeNonEmptyString(restrictions.ordered) || "nonDecreasing"
          : normalizeNonEmptyString(restrictions.ordered);

      if (tupleOrderedRule && !validateOrderedRule(normalizedTuple, tupleOrderedRule)) {
        addError({
          parameter: parameterName,
          message: `must satisfy ordered rule '${tupleOrderedRule}'`,
          value,
        });
        continue;
      }

      normalizedModelParameters[parameterName] = normalizedTuple;
      continue;
    }

    if (normalizedParameterType === "array") {
      if (!Array.isArray(value)) {
        addError({
          parameter: parameterName,
          message: "must be an array",
          value,
        });
        continue;
      }

      const expectedLength = resolveExpectedArrayLength(
        parameter,
        leafCriteriaCount
      );

      if (expectedLength !== null && value.length !== expectedLength) {
        addError({
          parameter: parameterName,
          message: `must contain exactly ${expectedLength} values`,
          value,
        });
        continue;
      }

      const normalizedArray = [];
      let arrayHasError = false;
      const itemType = normalizeNonEmptyString(restrictions.itemType) || "number";

      value.forEach((item, index) => {
        if (itemType === "number" || itemType === "integer") {
          const normalizedNumber = normalizeNumberValue(item);

          if (
            normalizedNumber === null ||
            (itemType === "integer" && !Number.isInteger(normalizedNumber))
          ) {
            arrayHasError = true;
            addError({
              parameter: parameterName,
              message: `[${index}] must be a ${itemType}`,
              value: item,
            });
            return;
          }

          if (!isWithinRange(normalizedNumber, restrictions)) {
            arrayHasError = true;
            addError({
              parameter: parameterName,
              message: `[${index}] must be between ${restrictions.min ?? "-∞"} and ${restrictions.max ?? "+∞"}`,
              value: item,
            });
            return;
          }

          normalizedArray.push(normalizedNumber);
          return;
        }

        if (itemType === "boolean") {
          if (typeof item !== "boolean") {
            arrayHasError = true;
            addError({
              parameter: parameterName,
              message: `[${index}] must be a boolean`,
              value: item,
            });
            return;
          }
          normalizedArray.push(item);
          return;
        }

        if (itemType === "string") {
          if (typeof item !== "string") {
            arrayHasError = true;
            addError({
              parameter: parameterName,
              message: `[${index}] must be a string`,
              value: item,
            });
            return;
          }
          normalizedArray.push(item.trim());
          return;
        }

        if (itemType === "fuzzyNumber") {
          if (!Array.isArray(item) || item.length !== 3) {
            arrayHasError = true;
            addError({
              parameter: parameterName,
              message: `[${index}] must be a fuzzy tuple [l,m,u]`,
              value: item,
            });
            return;
          }

          const normalizedTriangle = item.map((tupleItem) =>
            normalizeNumberValue(tupleItem)
          );
          if (normalizedTriangle.some((tupleItem) => tupleItem === null)) {
            arrayHasError = true;
            addError({
              parameter: parameterName,
              message: `[${index}] must contain finite numeric tuple values`,
              value: item,
            });
            return;
          }

          if (normalizedTriangle.some((tupleItem) => !isWithinRange(tupleItem, restrictions))) {
            arrayHasError = true;
            addError({
              parameter: parameterName,
              message: `[${index}] contains values outside allowed min/max`,
              value: item,
            });
            return;
          }

          const orderedRule =
            normalizeNonEmptyString(restrictions.ordered) || "nonDecreasing";
          if (!validateOrderedRule(normalizedTriangle, orderedRule)) {
            arrayHasError = true;
            addError({
              parameter: parameterName,
              message: `[${index}] must satisfy ordered rule '${orderedRule}'`,
              value: item,
            });
            return;
          }

          normalizedArray.push(normalizedTriangle);
          return;
        }

        arrayHasError = true;
        addError({
          parameter: parameterName,
          message: `uses unsupported itemType '${itemType}'`,
          value: item,
        });
      });

      if (arrayHasError) {
        continue;
      }

      const isCriterionWeights = isCriterionWeightsParameter({
        parameterName,
        parameter,
        restrictions,
      });

      if (isCriterionWeights) {
        const hasNegative = normalizedArray.some((item) => item < 0);
        if (hasNegative) {
          addError({
            parameter: parameterName,
            message: "must contain only values greater than or equal to 0",
            value,
          });
          continue;
        }

        const totalWeight = normalizedArray.reduce((sum, item) => sum + item, 0);
        if (totalWeight <= 0) {
          addError({
            parameter: parameterName,
            message: "must contain at least one value greater than 0",
            value,
          });
          continue;
        }

        const normalizedWeights = normalizedArray.map(
          (item) => item / totalWeight
        );

        normalizedModelParameters[parameterName] = normalizedWeights;
        continue;
      }

      if (restrictions.normalize === true && normalizedArray.length > 0) {
        const numericValues = normalizedArray.every(
          (item) => typeof item === "number" && Number.isFinite(item)
        );
        if (!numericValues) {
          addError({
            parameter: parameterName,
            message: "normalize=true requires numeric array values",
            value,
          });
          continue;
        }

        const total = normalizedArray.reduce((sum, item) => sum + item, 0);
        if (total <= 0) {
          addError({
            parameter: parameterName,
            message: "normalize=true requires sum greater than 0",
            value,
          });
          continue;
        }

        normalizedModelParameters[parameterName] = normalizedArray.map(
          (item) => item / total
        );
        continue;
      }

      if (
        typeof restrictions.sum === "number" &&
        Math.abs(
          normalizedArray.reduce((sum, item) => sum + item, 0) -
            restrictions.sum
        ) > 1e-6
      ) {
        addError({
          parameter: parameterName,
          message: `must sum to ${restrictions.sum}`,
          value,
        });
        continue;
      }

      if (
        restrictions.ordered &&
        !validateOrderedRule(normalizedArray, restrictions.ordered)
      ) {
        addError({
          parameter: parameterName,
          message: `must satisfy ordered rule '${restrictions.ordered}'`,
          value,
        });
        continue;
      }

      if (!isAllowedValue(normalizedArray, restrictions.allowed)) {
        addError({
          parameter: parameterName,
          message: "contains values outside allowed options",
          value,
        });
        continue;
      }

      normalizedModelParameters[parameterName] = normalizedArray;
      continue;
    }

    if (normalizedParameterType === "fuzzyArray") {
      if (!Array.isArray(value)) {
        addError({
          parameter: parameterName,
          message: "must be an array of fuzzy triples",
          value,
        });
        continue;
      }

      const expectedLength = resolveExpectedArrayLength(
        parameter,
        leafCriteriaCount
      );

      if (expectedLength !== null && value.length !== expectedLength) {
        addError({
          parameter: parameterName,
          message: `must contain exactly ${expectedLength} fuzzy values`,
          value,
        });
        continue;
      }

      const normalizedFuzzyArray = [];
      let fuzzyArrayHasError = false;

      value.forEach((triangle, index) => {
        if (!Array.isArray(triangle) || triangle.length !== 3) {
          fuzzyArrayHasError = true;
          addError({
            parameter: parameterName,
            message: `[${index}] must be an array [l,m,u]`,
            value: triangle,
          });
          return;
        }

        const normalizedTriangle = triangle.map((item) => normalizeNumberValue(item));

        if (normalizedTriangle.some((item) => item === null)) {
          fuzzyArrayHasError = true;
          addError({
            parameter: parameterName,
            message: `[${index}] must contain finite numeric values`,
            value: triangle,
          });
          return;
        }

        if (
          typeof restrictions.min === "number" &&
          normalizedTriangle.some((item) => item < restrictions.min)
        ) {
          fuzzyArrayHasError = true;
          addError({
            parameter: parameterName,
            message: `[${index}] contains values below min ${restrictions.min}`,
            value: triangle,
          });
          return;
        }

        if (
          typeof restrictions.max === "number" &&
          normalizedTriangle.some((item) => item > restrictions.max)
        ) {
          fuzzyArrayHasError = true;
          addError({
            parameter: parameterName,
            message: `[${index}] contains values above max ${restrictions.max}`,
            value: triangle,
          });
          return;
        }

        const orderedRule =
          normalizeNonEmptyString(restrictions.ordered) || "nonDecreasing";
        if (!validateOrderedRule(normalizedTriangle, orderedRule)) {
          fuzzyArrayHasError = true;
          addError({
            parameter: parameterName,
            message: `[${index}] must satisfy ordered rule '${orderedRule}'`,
            value: triangle,
          });
          return;
        }

        normalizedFuzzyArray.push(normalizedTriangle);
      });

      if (fuzzyArrayHasError) {
        continue;
      }

      normalizedModelParameters[parameterName] = normalizedFuzzyArray;
      continue;
    }
  }

  if (parameterErrors.length > 0) {
    buildInvalidParameterError({
      modelName,
      parameterErrors,
    });
  }

  return normalizedModelParameters;
};

/**
 * Normaliza y valida la entrada base para crear un issue.
 *
 * @param {Object} rawIssueInfo Datos recibidos en req.body.issueInfo.
 * @returns {Object}
 */
const normalizeCreateIssueInput = (rawIssueInfo) => {
  const issueInfo = rawIssueInfo || {};

  const issueName = normalizeString(issueInfo.issueName);
  const issueDescription = normalizeOptionalString(issueInfo.issueDescription);
  const selectedModelId = normalizeString(issueInfo.selectedModelId);
  const alternatives = Array.isArray(issueInfo.alternatives)
    ? issueInfo.alternatives
    : [];
  const withConsensus = Boolean(issueInfo.withConsensus);
  const criteria = Array.isArray(issueInfo.criteria) ? issueInfo.criteria : [];
  const addedExperts = Array.isArray(issueInfo.addedExperts)
    ? issueInfo.addedExperts
    : [];
  const domainAssignments = issueInfo.domainAssignments;
  const closureDate = issueInfo.closureDate;
  const consensusMaxPhases = issueInfo.consensusMaxPhases;
  const consensusThreshold = issueInfo.consensusThreshold;
  const paramValues = issueInfo.paramValues || {};
  const weightingMode = normalizeString(issueInfo.weightingMode || "manual");

  if (!issueName) {
    throw createBadRequestError("Issue name is required", {
      field: "issueName",
    });
  }

  if (!selectedModelId) {
    throw createBadRequestError("selectedModelId is required", {
      field: "selectedModelId",
    });
  }

  if (!isValidObjectIdLike(selectedModelId)) {
    throw createBadRequestError("Valid selectedModelId is required", {
      field: "selectedModelId",
    });
  }

  const uniqueAlternativeNames = getUniqueTrimmedStrings(alternatives);
  if (uniqueAlternativeNames.length <= 1) {
    throw createBadRequestError("Must be at least two valid alternatives", {
      field: "alternatives",
    });
  }

  const uniqueExpertEmails = Array.from(
    new Set((addedExperts || []).map(normalizeEmail).filter(Boolean))
  );

  if (uniqueExpertEmails.length === 0) {
    throw createBadRequestError("Must be at least one expert", {
      field: "addedExperts",
    });
  }

  if (!criteria.length) {
    throw createBadRequestError("At least one criterion is required", {
      field: "criteria",
    });
  }

  if (
    !domainAssignments ||
    typeof domainAssignments !== "object" ||
    !domainAssignments.experts ||
    typeof domainAssignments.experts !== "object"
  ) {
    throw createBadRequestError("domainAssignments.experts is required", {
      field: "domainAssignments",
    });
  }

  const normalizedAssignmentsByExpert = Object.fromEntries(
    Object.entries(domainAssignments.experts).map(([email, value]) => [
      normalizeEmail(email),
      value,
    ])
  );

  return {
    issueName,
    issueDescription,
    selectedModelId,
    uniqueAlternativeNames,
    withConsensus,
    criteria,
    uniqueExpertEmails,
    normalizedAssignmentsByExpert,
    closureDate,
    consensusMaxPhases,
    consensusThreshold,
    paramValues,
    weightingMode,
  };
};

/**
 * Carga y valida el modelo, admin y expertos para la creación del issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.adminUserId Id del admin actual.
 * @param {string} params.selectedModelId Id del modelo elegido.
 * @param {boolean} params.requestedWithConsensus Indicador withConsensus recibido en la petición.
 * @param {string} params.weightingMode Modo de ponderación solicitado.
 * @param {Object} params.paramValues Parámetros del modelo recibidos en la petición.
 * @param {Array<Object>} params.criteriaNodes Criterios recibidos en la petición.
 * @param {string[]} params.uniqueExpertEmails Correos únicos de expertos.
 * @param {Object} params.session Sesión de mongoose.
 * @returns {Promise<Object>}
 */
const loadCreateIssueActorsAndModel = async ({
  adminUserId,
  selectedModelId,
  requestedWithConsensus,
  weightingMode,
  paramValues,
  criteriaNodes,
  alternativesCount,
  uniqueExpertEmails,
  session,
}) => {
  const existingModel = await IssueModel.findById(selectedModelId).session(session);

  if (!existingModel) {
    throw createBadRequestError("Model does not exist", {
      field: "selectedModelId",
    });
  }

  const {
    apiModelKey,
    apiEndpoint,
    inputKind,
    outputKind,
    evaluationStructure: modelEvaluationStructure,
    lifecycleKind: modelLifecycleKind,
    modelFamilyKey,
    modelVersion,
    versionLabel,
  } = validateIssueModelRuntimeConfigOrThrow(existingModel);
  validateIssueConsensusCompatibilityOrThrow({
    requestedWithConsensus,
    model: existingModel,
    lifecycleKind: modelLifecycleKind,
  });

  const normalizedModelParameters = validateAndNormalizeModelParametersSharedOrThrow({
    model: existingModel,
    paramValues,
    criteriaNodes,
    alternativesCount,
  });

  const requiresCriterionWeights = modelRequiresCriterionWeights(existingModel);
  const leafCriteriaCount = countLeafCriteriaNodes(criteriaNodes);
  const normalizedWeightingMode = normalizeNonEmptyString(weightingMode);
  const hasNormalizedWeights = Array.isArray(normalizedModelParameters?.weights);

  if (
    normalizedWeightingMode === "manual" &&
    requiresCriterionWeights &&
    leafCriteriaCount > 1 &&
    !hasNormalizedWeights
  ) {
    throw createBadRequestError(
      "Manual weighting mode requires valid model parameter 'weights'",
      {
        field: "paramValues.weights",
        details: {
          weightingMode: normalizedWeightingMode,
          requiredByModel: true,
          leafCriteriaCount,
        },
      }
    );
  }

  const admin = await User.findById(adminUserId).session(session);
  if (!admin) {
    throw createNotFoundError("Admin not found");
  }

  const expertUsers = await User.find({
    email: { $in: uniqueExpertEmails },
  }).session(session);

  const expertByEmail = new Map(
    expertUsers.map((user) => [normalizeEmail(user.email), user])
  );

  const missingExperts = uniqueExpertEmails.filter(
    (email) => !expertByEmail.has(email)
  );

  if (missingExperts.length > 0) {
    throw createBadRequestError(
      `Experts not found: ${missingExperts.join(", ")}`,
      {
        field: "addedExperts",
      }
    );
  }

  return {
    model: existingModel,
    admin,
    adminEmail: normalizeEmail(admin.email),
    expertUsers,
    expertByEmail,
    modelEvaluationStructure,
    modelLifecycleKind,
    apiModelKey,
    apiEndpoint,
    inputKind,
    outputKind,
    modelFamilyKey,
    modelVersion,
    versionLabel,
    normalizedModelParameters,
  };
};

/**
 * Crea las alternativas del issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {string[]} params.uniqueAlternativeNames Nombres de alternativas.
 * @param {Object} params.session Sesión de mongoose.
 * @returns {Promise<Array<Object>>}
 */
const createIssueAlternatives = async ({
  issueId,
  uniqueAlternativeNames,
  session,
}) => {
  if (!uniqueAlternativeNames.length) {
    return [];
  }

  return Alternative.insertMany(
    uniqueAlternativeNames.map((name) => ({
      issue: issueId,
      name,
    })),
    { session, ordered: true }
  );
};

/**
 * Crea recursivamente la jerarquía de criterios del issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {Array<Object>} params.nodes Nodos de criterios.
 * @param {Array<Object>} params.leafCriteria Acumulador de criterios hoja.
 * @param {Object} params.session Sesión de mongoose.
 * @param {string|Object|null} [params.parentCriterionId=null] Id del criterio padre.
 * @returns {Promise<void>}
 */
const createCriteriaRecursively = async ({
  issueId,
  nodes,
  leafCriteria,
  session,
  parentCriterionId = null,
}) => {
  if (!Array.isArray(nodes)) return;

  for (const node of nodes) {
    const children = Array.isArray(node?.children) ? node.children : [];
    const isLeaf = children.length === 0;
    const criterionName = normalizeString(node?.name);
    const criterionType = normalizeString(node?.type);

    if (!criterionName) {
      throw createBadRequestError("Criterion name is required", {
        field: "criteria",
      });
    }

    const criterion = new Criterion({
      issue: issueId,
      parentCriterion: parentCriterionId,
      name: criterionName,
      type: criterionType,
      isLeaf,
    });

    await criterion.save({ session });

    if (isLeaf) {
      leafCriteria.push(criterion);
      continue;
    }

    await createCriteriaRecursively({
      issueId,
      nodes: children,
      leafCriteria,
      session,
      parentCriterionId: criterion._id,
    });
  }
};

/**
 * Construye el mapa experto+alternativa+criterio -> dominio fuente
 * y devuelve los ids de dominios utilizados.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string[]} params.uniqueExpertEmails Correos de expertos.
 * @param {Object} params.normalizedAssignmentsByExpert Asignaciones por experto.
 * @param {Map<string, Object>} params.expertByEmail Usuarios por email.
 * @param {Array<Object>} params.createdAlternatives Alternativas creadas.
 * @param {Array<Object>} params.leafCriteria Criterios hoja creados.
 * @param {string[]} params.uniqueAlternativeNames Nombres de alternativas.
 * @returns {Object}
 */
const buildExpertAssignmentDomainMap = ({
  uniqueExpertEmails,
  normalizedAssignmentsByExpert,
  expertByEmail,
  createdAlternatives,
  leafCriteria,
  uniqueAlternativeNames,
}) => {
  const alternativeByName = new Map(
    createdAlternatives.map((alternative) => [alternative.name, alternative])
  );

  const sourceDomainByEvaluationKey = new Map();
  const usedDomainIds = new Set();

  for (const email of uniqueExpertEmails) {
    const expertUser = expertByEmail.get(email);
    const expertAssignments = normalizedAssignmentsByExpert[email];

    if (!expertAssignments || typeof expertAssignments !== "object") {
      throw createBadRequestError(
        `Missing domain assignments for expert '${email}'`,
        {
          field: "domainAssignments",
        }
      );
    }

    const alternativesBlock = expertAssignments.alternatives || {};
    const expertId = toIdString(expertUser?._id);

    for (const alternativeName of uniqueAlternativeNames) {
      const alternativeDoc = alternativeByName.get(alternativeName);
      const criteriaBlock = alternativesBlock[alternativeName]?.criteria || {};

      if (!alternativeDoc) {
        throw createBadRequestError(
          `Alternative '${alternativeName}' not found while building assignments`,
          {
            field: "domainAssignments",
          }
        );
      }

      const alternativeId = toIdString(alternativeDoc._id);

      for (const leafCriterion of leafCriteria) {
        const domainId = toIdString(criteriaBlock[leafCriterion.name]);

        if (!domainId) {
          throw createBadRequestError(
            `Missing domain assignment for criterion '${leafCriterion.name}' (expert ${email}, alternative ${alternativeName})`,
            {
              field: "domainAssignments",
            }
          );
        }

        const criterionId = toIdString(leafCriterion._id);
        const evaluationKey = `${expertId}_${alternativeId}_${criterionId}`;

        sourceDomainByEvaluationKey.set(evaluationKey, domainId);
        usedDomainIds.add(domainId);
      }
    }
  }

  return {
    usedDomainIds: Array.from(usedDomainIds),
    sourceDomainByEvaluationKey,
  };
};

/**
 * Carga y valida los dominios de expresión usados en el issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string[]} params.domainIdList Ids de dominios requeridos.
 * @param {string} params.userId Id del usuario actual.
 * @param {Object} params.session Sesión de mongoose.
 * @returns {Promise<Array<Object>>}
 */
const loadAccessibleExpressionDomains = async ({
  domainIdList,
  userId,
  session,
}) => {
  const domainDocs = await ExpressionDomain.find({
    _id: { $in: domainIdList },
    $or: [
      { isGlobal: true, user: null },
      { isGlobal: false, user: userId },
    ],
  })
    .select("_id name type numericRange linguisticLabels")
    .session(session);

  const existingDomainIds = new Set(
    domainDocs.map((domain) => toIdString(domain._id)).filter(Boolean)
  );

  const missingDomains = domainIdList.filter(
    (domainId) => !existingDomainIds.has(domainId)
  );

  if (missingDomains.length > 0) {
    throw createBadRequestError(
      `ExpressionDomain not found or not accessible: ${missingDomains.join(", ")}`,
      {
        field: "domainAssignments",
      }
    );
  }

  return domainDocs;
};

/**
 * Construye los documentos iniciales de Evaluation con snapshots ya resueltos.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {Array<Object>} params.expertUsers Expertos participantes.
 * @param {Array<Object>} params.createdAlternatives Alternativas creadas.
 * @param {Array<Object>} params.leafCriteria Criterios hoja creados.
 * @param {string} params.modelEvaluationStructure Estructura de evaluación del modelo.
 * @param {Map<string, string>} params.sourceDomainByEvaluationKey Dominio fuente por triple experto/alternativa/criterio.
 * @param {Map<string, Object>} params.snapshotMap Snapshot por dominio fuente.
 * @returns {Array<Object>}
 */
const buildIssueEvaluationDocsWithSnapshots = ({
  issueId,
  expertUsers,
  createdAlternatives,
  leafCriteria,
  modelEvaluationStructure,
  sourceDomainByEvaluationKey,
  snapshotMap,
}) => {
  const baseEvaluationDocs = buildInitialAlternativeEvaluationDocs({
    issueId,
    experts: expertUsers,
    leafCriteria,
    alternatives: createdAlternatives,
    evaluationStructure: modelEvaluationStructure,
    consensusPhase: 1,
    includeReciprocal: true,
  });

  return baseEvaluationDocs.map((doc) => {
    const evaluationKey = `${toIdString(doc.expert)}_${toIdString(
      doc.alternative
    )}_${toIdString(doc.criterion)}`;

    const sourceDomainId = sourceDomainByEvaluationKey.get(evaluationKey);
    const issueSnapshotId = snapshotMap.get(toIdString(sourceDomainId));

    if (!issueSnapshotId) {
      throw createBadRequestError(
        `Snapshot not found for domain ${String(sourceDomainId)}`,
        {
          field: "domainAssignments",
        }
      );
    }

    const { completed, ...persistableDoc } = doc;

    return {
      ...persistableDoc,
      expressionDomain: issueSnapshotId,
      value: null,
      timestamp: null,
      history: [],
      consensusPhase: 1,
    };
  });
};

/**
 * Crea un nuevo issue con alternativas, criterios, snapshots,
 * participaciones y evaluaciones iniciales.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.issueInfo Payload issueInfo recibido.
 * @param {string} params.adminUserId Id del usuario actual.
 * @param {Object} params.session Sesión de mongoose.
 * @returns {Promise<Object>}
 */
export const createIssueFlow = async ({
  issueInfo,
  adminUserId,
  session,
}) => {
  const input = normalizeCreateIssueInput(issueInfo);

  const existingIssue = await Issue.findOne({ name: input.issueName }).session(
    session
  );
  if (existingIssue) {
    throw createConflictError("Issue name already exists", {
      field: "issueName",
    });
  }

  const {
    model,
    admin,
    adminEmail,
    expertUsers,
    expertByEmail,
    modelEvaluationStructure,
    modelLifecycleKind,
    apiModelKey,
    apiEndpoint,
    inputKind,
    outputKind,
    modelFamilyKey,
    modelVersion,
    versionLabel,
    normalizedModelParameters,
  } = await loadCreateIssueActorsAndModel({
    adminUserId,
    selectedModelId: input.selectedModelId,
    requestedWithConsensus: input.withConsensus,
    weightingMode: input.weightingMode,
    paramValues: input.paramValues,
    criteriaNodes: input.criteria,
    alternativesCount: input.uniqueAlternativeNames.length,
    uniqueExpertEmails: input.uniqueExpertEmails,
    session,
  });

  const issue = new Issue({
    admin: adminUserId,
    model: model._id,
    apiModelKey,
    apiEndpoint,
    inputKind,
    outputKind,
    modelFamilyKey,
    modelVersion,
    versionLabel,
    evaluationStructure: modelEvaluationStructure,
    lifecycleKind: modelLifecycleKind,
    consensusPhase: 1,
    isConsensus: input.withConsensus,
    name: input.issueName,
    description: input.issueDescription,
    active: true,
    creationDate: dayjs().format("DD-MM-YYYY"),
    closureDate: input.closureDate
      ? dayjs(input.closureDate).format("DD-MM-YYYY")
      : null,
    weightingMode: input.weightingMode,
    currentStage: "criteriaWeighting",
    ...(Boolean(model.isConsensus) && {
      consensusMaxPhases: input.consensusMaxPhases,
      consensusThreshold: input.consensusThreshold,
    }),
    modelParameters: normalizedModelParameters,
  });

  await issue.save({ session });

  const createdAlternatives = await createIssueAlternatives({
    issueId: issue._id,
    uniqueAlternativeNames: input.uniqueAlternativeNames,
    session,
  });

  const leafCriteria = [];
  await createCriteriaRecursively({
    issueId: issue._id,
    nodes: input.criteria,
    leafCriteria,
    session,
  });

  if (leafCriteria.length === 0) {
    throw createBadRequestError("At least one leaf criterion is required", {
      field: "criteria",
    });
  }

  issue.alternativeOrder = createdAlternatives
    .slice()
    .sort((a, b) => compareNameId(a.name, a._id, b.name, b._id))
    .map((alternative) => alternative._id);

  issue.leafCriteriaOrder = leafCriteria
    .slice()
    .sort((a, b) => compareNameId(a.name, a._id, b.name, b._id))
    .map((criterion) => criterion._id);

  const isSingleLeafCriterion = leafCriteria.length === 1;

  issue.currentStage = resolveInitialIssueStage({
    leafCriteriaCount: leafCriteria.length,
    weightingMode: input.weightingMode,
  });
  const isCriteriaWeightingRequired = issue.currentStage === "criteriaWeighting";

  if (isSingleLeafCriterion) {
    const previousParams = issue.modelParameters || {};

    issue.modelParameters = {
      ...previousParams,
      weights:
        previousParams.weights != null
          ? normalizeSingleWeight(previousParams.weights)
          : [1],
    };
  }

  await issue.save({ session });

  const participationDocs = [];
  const notificationDocs = [];
  const emailsToSend = [];

  for (const email of input.uniqueExpertEmails) {
    const expertUser = expertByEmail.get(email);
    const isAdminExpert = email === adminEmail;

    participationDocs.push({
      issue: issue._id,
      expert: expertUser._id,
      invitationStatus: isAdminExpert ? "accepted" : "pending",
      evaluationCompleted: false,
      weightsCompleted: !isCriteriaWeightingRequired,
      entryPhase: null,
      entryStage: null,
      joinedAt: new Date(),
    });

    if (!isAdminExpert) {
      notificationDocs.push({
        expert: expertUser._id,
        issue: issue._id,
        type: "invitation",
        message: `You have been invited by ${admin.name} to participate in ${input.issueName}.`,
        read: false,
        requiresAction: true,
      });

      emailsToSend.push({
        expertEmail: email,
        issueName: input.issueName,
        issueDescription: input.issueDescription,
        adminEmail,
      });
    }
  }

  if (participationDocs.length > 0) {
    await Participation.insertMany(participationDocs, {
      session,
      ordered: true,
    });
  }

  if (notificationDocs.length > 0) {
    await Notification.insertMany(notificationDocs, {
      session,
      ordered: true,
    });
  }

  const { usedDomainIds, sourceDomainByEvaluationKey } =
    buildExpertAssignmentDomainMap({
      uniqueExpertEmails: input.uniqueExpertEmails,
      normalizedAssignmentsByExpert: input.normalizedAssignmentsByExpert,
      expertByEmail,
      createdAlternatives,
      leafCriteria,
      uniqueAlternativeNames: input.uniqueAlternativeNames,
    });

  const domainDocs = await loadAccessibleExpressionDomains({
    domainIdList: usedDomainIds,
    userId: adminUserId,
    session,
  });

  const snapshotMap = await createIssueDomainSnapshots({
    issueId: issue._id,
    domainDocs,
    session,
  });

  const evaluationDocs = buildIssueEvaluationDocsWithSnapshots({
    issueId: issue._id,
    expertUsers,
    createdAlternatives,
    leafCriteria,
    modelEvaluationStructure,
    sourceDomainByEvaluationKey,
    snapshotMap,
  });

  if (evaluationDocs.length > 0) {
    await Evaluation.insertMany(evaluationDocs, {
      session,
      ordered: true,
    });
  }

  const criteriaWeightDocs = buildInitialCriteriaWeightEvaluationDocs({
    issueId: issue._id,
    experts: expertUsers,
    leafCriteria,
    weightingMode: input.weightingMode,
    consensusPhase: 1,
    completed: false,
  });

  if (criteriaWeightDocs.length > 0) {
    await CriteriaWeightEvaluation.insertMany(criteriaWeightDocs, {
      session,
      ordered: true,
    });
  }

  return {
    issueName: input.issueName,
    emailsToSend,
  };
};
