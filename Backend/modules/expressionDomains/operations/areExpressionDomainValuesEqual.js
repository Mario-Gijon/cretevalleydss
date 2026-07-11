import { createBadRequestError } from "../../../utils/common/errors.js";
import { getExpressionDomainTypeOrThrow } from "../expressionDomainTypeCatalog.js";
import { validateFuzzyValuesOrThrow } from "./validateFuzzyValues.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const hasOnlyLabelKey = (value) =>
  isPlainObject(value) &&
  Object.keys(value).length === 1 &&
  typeof value.labelKey === "string";

const hasOnlyValues = (value) =>
  isPlainObject(value) &&
  Object.keys(value).length === 1 &&
  Array.isArray(value.values);

export const areExpressionDomainValuesEqual = ({
  left,
  right,
  expressionDomain,
  epsilon = 1e-9,
}) => {
  if (typeof epsilon !== "number" || !Number.isFinite(epsilon) || epsilon < 0) {
    throw createBadRequestError("epsilon must be a non-negative finite number.", {
      field: "epsilon",
    });
  }

  const typeKey = expressionDomain?.typeKey;

  if (typeof typeKey !== "string" || typeKey.trim() === "") {
    throw createBadRequestError("expressionDomain.typeKey is required.", {
      field: "expressionDomain",
    });
  }

  const normalizedTypeKey = typeKey.trim();
  getExpressionDomainTypeOrThrow(normalizedTypeKey);

  switch (normalizedTypeKey) {
    case "numericContinuous":
    case "numericDiscrete":
      return (
        typeof left === "number" &&
        Number.isFinite(left) &&
        typeof right === "number" &&
        Number.isFinite(right) &&
        Math.abs(left - right) <= epsilon
      );

    case "linguisticOrdinal":
      return (
        hasOnlyLabelKey(left) &&
        hasOnlyLabelKey(right) &&
        left.labelKey === right.labelKey
      );

    case "linguisticFuzzy":
      if (hasOnlyLabelKey(left) && hasOnlyLabelKey(right)) {
        return left.labelKey === right.labelKey;
      }

      if (hasOnlyValues(left) && hasOnlyValues(right)) {
        validateFuzzyValuesOrThrow({ values: left.values, epsilon, field: "left.values" });
        validateFuzzyValuesOrThrow({ values: right.values, epsilon, field: "right.values" });

        if (left.values.length !== right.values.length) {
          return false;
        }

        return left.values.every(
          (item, index) => Math.abs(item - right.values[index]) <= epsilon
        );
      }

      return false;

    default:
      throw createBadRequestError(`Unsupported expression domain type: ${normalizedTypeKey}`, {
        code: "UNSUPPORTED_EXPRESSION_DOMAIN_TYPE",
        field: "typeKey",
      });
  }
};

