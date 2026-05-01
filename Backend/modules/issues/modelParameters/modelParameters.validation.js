import { createBadRequestError } from "../../../utils/common/errors.js";

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

const normalizeNonEmptyString = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const resolveParameterKey = (parameter) => {
  return (
    normalizeNonEmptyString(parameter?.key) ||
    normalizeNonEmptyString(parameter?.name)
  );
};

const isMissingParameterValue = (value) =>
  value === undefined || value === null || value === "";

const getValueType = (value) => {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
};

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

const resolveExpectedArrayLength = ({
  parameter,
  leafCriteriaCount,
  alternativesCount,
}) => {
  const configuredLength = parameter?.restrictions?.length;

  if (configuredLength === "matchCriteria") {
    return leafCriteriaCount;
  }

  if (configuredLength === "matchAlternatives") {
    return alternativesCount;
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

const isCriterionWeightsParameter = ({ parameterName, parameter, restrictions }) => {
  if (parameterName !== "weights") {
    return false;
  }

  return (
    normalizeNonEmptyString(parameter?.type) === "array" &&
    restrictions?.length === "matchCriteria"
  );
};

const resolveCriteriaWeightsDefault = ({
  value,
  parameterName,
  parameter,
  restrictions,
  leafCriteriaCount,
}) => {
  const isCriterionWeights = isCriterionWeightsParameter({
    parameterName,
    parameter,
    restrictions,
  });

  if (!isCriterionWeights) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim().toLowerCase() === "equal" &&
    Number.isInteger(leafCriteriaCount) &&
    leafCriteriaCount > 0
  ) {
    return Array.from({ length: leafCriteriaCount }, () => 1);
  }

  return value;
};

const buildInvalidParameterError = ({ modelName, parameterErrors }) => {
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

export const validateAndNormalizeModelParametersOrThrow = ({
  model,
  paramValues,
  criteriaNodes,
  alternativesCount = null,
}) => {
  const modelName = normalizeNonEmptyString(model?.name) || "unknown";
  const modelParameters = Array.isArray(model?.parameters) ? model.parameters : [];
  const leafCriteriaCount = countLeafCriteriaNodes(criteriaNodes);
  const resolvedAlternativesCount =
    Number.isInteger(alternativesCount) && alternativesCount >= 0
      ? alternativesCount
      : null;

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
    const restrictions = parameter?.restrictions || {};
    const isRequired = parameter?.required === true;
    const hasProvidedValue = Object.prototype.hasOwnProperty.call(
      rawParamValues,
      parameterName
    );
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

    value = resolveCriteriaWeightsDefault({
      value,
      parameterName,
      parameter,
      restrictions,
      leafCriteriaCount,
    });

    if (!SUPPORTED_PARAMETER_TYPES.has(String(parameterType || ""))) {
      addError({
        parameter: parameterName,
        message: `uses unsupported type '${String(parameterType || "unknown")}'`,
        value,
      });
      continue;
    }

    if (parameterType === "number" || parameterType === "integer") {
      const normalizedNumber = normalizeNumberValue(value);
      if (normalizedNumber === null) {
        addError({ parameter: parameterName, message: "must be a finite number", value });
        continue;
      }
      if (parameterType === "integer" && !Number.isInteger(normalizedNumber)) {
        addError({ parameter: parameterName, message: "must be an integer", value });
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
        addError({ parameter: parameterName, message: "contains a value outside allowed options", value });
        continue;
      }
      normalizedModelParameters[parameterName] = normalizedNumber;
      continue;
    }

    if (parameterType === "enum") {
      if (!isAllowedValue(value, restrictions.allowed)) {
        addError({ parameter: parameterName, message: "must be one of the allowed enum values", value });
        continue;
      }
      normalizedModelParameters[parameterName] = value;
      continue;
    }

    if (parameterType === "string") {
      if (typeof value !== "string") {
        addError({ parameter: parameterName, message: "must be a string", value });
        continue;
      }
      const normalizedString = value.trim();
      if (!isAllowedValue(normalizedString, restrictions.allowed)) {
        addError({ parameter: parameterName, message: "contains a value outside allowed options", value });
        continue;
      }
      normalizedModelParameters[parameterName] = normalizedString;
      continue;
    }

    if (parameterType === "boolean") {
      let normalizedBoolean = null;
      if (typeof value === "boolean") normalizedBoolean = value;
      else if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true") normalizedBoolean = true;
        if (normalized === "false") normalizedBoolean = false;
      }
      if (normalizedBoolean === null) {
        addError({ parameter: parameterName, message: "must be a boolean", value });
        continue;
      }
      if (!isAllowedValue(normalizedBoolean, restrictions.allowed)) {
        addError({ parameter: parameterName, message: "contains a value outside allowed options", value });
        continue;
      }
      normalizedModelParameters[parameterName] = normalizedBoolean;
      continue;
    }

    if (parameterType === "interval") {
      if (!Array.isArray(value) || value.length !== 2) {
        addError({ parameter: parameterName, message: "must be an array of exactly 2 numeric values", value });
        continue;
      }
      const normalizedInterval = value.map((item) => normalizeNumberValue(item));
      if (normalizedInterval.some((item) => item === null)) {
        addError({ parameter: parameterName, message: "must contain finite numeric values", value });
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
      if (restrictions.ordered && !validateOrderedRule(normalizedInterval, restrictions.ordered)) {
        addError({ parameter: parameterName, message: `must satisfy ordered rule '${restrictions.ordered}'`, value });
        continue;
      }
      normalizedModelParameters[parameterName] = normalizedInterval;
      continue;
    }

    if (parameterType === "tuple" || parameterType === "fuzzyNumber") {
      if (!Array.isArray(value)) {
        addError({ parameter: parameterName, message: "must be an array", value });
        continue;
      }
      const expectedTupleLength =
        parameterType === "fuzzyNumber"
          ? 3
          : typeof restrictions.tupleLength === "number"
            ? restrictions.tupleLength
            : typeof restrictions.length === "number"
              ? restrictions.length
              : null;

      if (expectedTupleLength !== null && value.length !== expectedTupleLength) {
        addError({ parameter: parameterName, message: `must contain exactly ${expectedTupleLength} values`, value });
        continue;
      }

      const tupleItemType =
        parameterType === "fuzzyNumber"
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
            addError({ parameter: parameterName, message: `[${index}] must be a ${tupleItemType}`, value: item });
            return;
          }
          if (!isWithinRange(normalizedNumber, restrictions)) {
            tupleHasError = true;
            addError({ parameter: parameterName, message: `[${index}] must be between ${restrictions.min ?? "-∞"} and ${restrictions.max ?? "+∞"}`, value: item });
            return;
          }
          normalizedTuple.push(normalizedNumber);
          return;
        }

        if (tupleItemType === "string") {
          if (typeof item !== "string") {
            tupleHasError = true;
            addError({ parameter: parameterName, message: `[${index}] must be a string`, value: item });
            return;
          }
          normalizedTuple.push(item.trim());
          return;
        }

        if (tupleItemType === "boolean") {
          if (typeof item !== "boolean") {
            tupleHasError = true;
            addError({ parameter: parameterName, message: `[${index}] must be a boolean`, value: item });
            return;
          }
          normalizedTuple.push(item);
          return;
        }

        tupleHasError = true;
        addError({ parameter: parameterName, message: `[${index}] uses unsupported tuple itemType '${tupleItemType}'`, value: item });
      });

      if (tupleHasError) continue;

      const tupleOrderedRule =
        parameterType === "fuzzyNumber"
          ? normalizeNonEmptyString(restrictions.ordered) || "nonDecreasing"
          : normalizeNonEmptyString(restrictions.ordered);

      if (tupleOrderedRule && !validateOrderedRule(normalizedTuple, tupleOrderedRule)) {
        addError({ parameter: parameterName, message: `must satisfy ordered rule '${tupleOrderedRule}'`, value });
        continue;
      }

      normalizedModelParameters[parameterName] = normalizedTuple;
      continue;
    }

    if (parameterType === "array") {
      if (!Array.isArray(value)) {
        addError({ parameter: parameterName, message: "must be an array", value });
        continue;
      }

      const expectedLength = resolveExpectedArrayLength({
        parameter,
        leafCriteriaCount,
        alternativesCount: resolvedAlternativesCount,
      });

      if (expectedLength !== null && value.length !== expectedLength) {
        addError({ parameter: parameterName, message: `must contain exactly ${expectedLength} values`, value });
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
            addError({ parameter: parameterName, message: `[${index}] must be a ${itemType}`, value: item });
            return;
          }
          if (!isWithinRange(normalizedNumber, restrictions)) {
            arrayHasError = true;
            addError({ parameter: parameterName, message: `[${index}] must be between ${restrictions.min ?? "-∞"} and ${restrictions.max ?? "+∞"}`, value: item });
            return;
          }
          normalizedArray.push(normalizedNumber);
          return;
        }

        if (itemType === "boolean") {
          if (typeof item !== "boolean") {
            arrayHasError = true;
            addError({ parameter: parameterName, message: `[${index}] must be a boolean`, value: item });
            return;
          }
          normalizedArray.push(item);
          return;
        }

        if (itemType === "string") {
          if (typeof item !== "string") {
            arrayHasError = true;
            addError({ parameter: parameterName, message: `[${index}] must be a string`, value: item });
            return;
          }
          normalizedArray.push(item.trim());
          return;
        }

        if (itemType === "fuzzyNumber") {
          if (!Array.isArray(item) || item.length !== 3) {
            arrayHasError = true;
            addError({ parameter: parameterName, message: `[${index}] must be a fuzzy tuple [l,m,u]`, value: item });
            return;
          }
          const normalizedTriangle = item.map((tupleItem) => normalizeNumberValue(tupleItem));
          if (normalizedTriangle.some((tupleItem) => tupleItem === null)) {
            arrayHasError = true;
            addError({ parameter: parameterName, message: `[${index}] must contain finite numeric tuple values`, value: item });
            return;
          }
          if (normalizedTriangle.some((tupleItem) => !isWithinRange(tupleItem, restrictions))) {
            arrayHasError = true;
            addError({ parameter: parameterName, message: `[${index}] contains values outside allowed min/max`, value: item });
            return;
          }
          const orderedRule = normalizeNonEmptyString(restrictions.ordered) || "nonDecreasing";
          if (!validateOrderedRule(normalizedTriangle, orderedRule)) {
            arrayHasError = true;
            addError({ parameter: parameterName, message: `[${index}] must satisfy ordered rule '${orderedRule}'`, value: item });
            return;
          }
          normalizedArray.push(normalizedTriangle);
          return;
        }

        arrayHasError = true;
        addError({ parameter: parameterName, message: `uses unsupported itemType '${itemType}'`, value: item });
      });

      if (arrayHasError) continue;

      const isCriterionWeights = isCriterionWeightsParameter({
        parameterName,
        parameter,
        restrictions,
      });

      if (isCriterionWeights) {
        const hasNegative = normalizedArray.some((item) => item < 0);
        if (hasNegative) {
          addError({ parameter: parameterName, message: "must contain only values greater than or equal to 0", value });
          continue;
        }
        const totalWeight = normalizedArray.reduce((sum, item) => sum + item, 0);
        if (totalWeight <= 0) {
          addError({ parameter: parameterName, message: "must contain at least one value greater than 0", value });
          continue;
        }
        normalizedModelParameters[parameterName] = normalizedArray.map((item) => item / totalWeight);
        continue;
      }

      if (restrictions.normalize === true && normalizedArray.length > 0) {
        const numericValues = normalizedArray.every(
          (item) => typeof item === "number" && Number.isFinite(item)
        );
        if (!numericValues) {
          addError({ parameter: parameterName, message: "normalize=true requires numeric array values", value });
          continue;
        }
        const total = normalizedArray.reduce((sum, item) => sum + item, 0);
        if (total <= 0) {
          addError({ parameter: parameterName, message: "normalize=true requires sum greater than 0", value });
          continue;
        }
        normalizedModelParameters[parameterName] = normalizedArray.map((item) => item / total);
        continue;
      }

      if (
        typeof restrictions.sum === "number" &&
        Math.abs(normalizedArray.reduce((sum, item) => sum + item, 0) - restrictions.sum) >
          1e-6
      ) {
        addError({ parameter: parameterName, message: `must sum to ${restrictions.sum}`, value });
        continue;
      }

      if (restrictions.ordered && !validateOrderedRule(normalizedArray, restrictions.ordered)) {
        addError({ parameter: parameterName, message: `must satisfy ordered rule '${restrictions.ordered}'`, value });
        continue;
      }

      if (!isAllowedValue(normalizedArray, restrictions.allowed)) {
        addError({ parameter: parameterName, message: "contains values outside allowed options", value });
        continue;
      }

      normalizedModelParameters[parameterName] = normalizedArray;
      continue;
    }

    if (parameterType === "fuzzyArray") {
      if (!Array.isArray(value)) {
        addError({ parameter: parameterName, message: "must be an array of fuzzy triples", value });
        continue;
      }

      const expectedLength = resolveExpectedArrayLength({
        parameter,
        leafCriteriaCount,
        alternativesCount: resolvedAlternativesCount,
      });

      if (expectedLength !== null && value.length !== expectedLength) {
        addError({ parameter: parameterName, message: `must contain exactly ${expectedLength} fuzzy values`, value });
        continue;
      }

      const normalizedFuzzyArray = [];
      let fuzzyArrayHasError = false;

      value.forEach((triangle, index) => {
        if (!Array.isArray(triangle) || triangle.length !== 3) {
          fuzzyArrayHasError = true;
          addError({ parameter: parameterName, message: `[${index}] must be an array [l,m,u]`, value: triangle });
          return;
        }

        const normalizedTriangle = triangle.map((item) => normalizeNumberValue(item));
        if (normalizedTriangle.some((item) => item === null)) {
          fuzzyArrayHasError = true;
          addError({ parameter: parameterName, message: `[${index}] must contain finite numeric values`, value: triangle });
          return;
        }

        if (
          typeof restrictions.min === "number" &&
          normalizedTriangle.some((item) => item < restrictions.min)
        ) {
          fuzzyArrayHasError = true;
          addError({ parameter: parameterName, message: `[${index}] contains values below min ${restrictions.min}`, value: triangle });
          return;
        }

        if (
          typeof restrictions.max === "number" &&
          normalizedTriangle.some((item) => item > restrictions.max)
        ) {
          fuzzyArrayHasError = true;
          addError({ parameter: parameterName, message: `[${index}] contains values above max ${restrictions.max}`, value: triangle });
          return;
        }

        const orderedRule = normalizeNonEmptyString(restrictions.ordered) || "nonDecreasing";
        if (!validateOrderedRule(normalizedTriangle, orderedRule)) {
          fuzzyArrayHasError = true;
          addError({ parameter: parameterName, message: `[${index}] must satisfy ordered rule '${orderedRule}'`, value: triangle });
          return;
        }

        normalizedFuzzyArray.push(normalizedTriangle);
      });

      if (fuzzyArrayHasError) {
        continue;
      }

      normalizedModelParameters[parameterName] = normalizedFuzzyArray;
    }
  }

  if (parameterErrors.length > 0) {
    buildInvalidParameterError({ modelName, parameterErrors });
  }

  return normalizedModelParameters;
};
