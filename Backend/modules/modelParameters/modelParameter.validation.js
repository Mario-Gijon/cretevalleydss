import { createBadRequestError } from "../../utils/common/errors.js";
import {
  countLeafCriteriaNodes,
  isCriterionWeightsParameter,
  normalizeNonEmptyString,
  resolveExpectedArrayLength,
  resolveParameterKey,
} from "./modelParameter.metadata.js";
import {
  isMissingParameterValue,
  resolveCriteriaWeightsDefault,
  resolvePerCriterionScalarValue,
} from "./modelParameter.defaults.js";
import {
  getValueType,
  isAllowedValue,
  isWithinRange,
  normalizeNumberValue,
  validateOrderedRule,
} from "./modelParameter.normalization.js";

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
      parameter,
      leafCriteriaCount,
    });

    value = resolvePerCriterionScalarValue({
      value,
      parameter,
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
        parameter,
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

        if (
          typeof restrictions.sum === "number" &&
          Math.abs(totalWeight - restrictions.sum) > 1e-6
        ) {
          addError({
            parameter: parameterName,
            message: `must sum to ${restrictions.sum}`,
            value,
          });
          continue;
        }

        normalizedModelParameters[parameterName] = normalizedArray;
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
