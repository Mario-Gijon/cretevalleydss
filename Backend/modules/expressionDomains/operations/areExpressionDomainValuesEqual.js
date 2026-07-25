import { createBadRequestError } from "../../../utils/common/errors.js";
import { isPlainObject } from "../../../utils/common/objects.js";
import { getExpressionDomainTypeOrThrow } from "../expressionDomainTypeCatalog.js";
import {
  getLinguisticFuzzyEvaluationLabels,
  normalizeLinguisticFuzzyEvaluationValue,
} from "../types/linguisticFuzzy/evaluation.js";
import {
  getLinguisticOrdinalEvaluationLabels,
  normalizeLinguisticOrdinalEvaluationValue,
} from "../types/linguisticOrdinal/evaluation.js";
import { validateFuzzyValuesOrThrow } from "./validateFuzzyValues.js";

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
      if (!hasOnlyLabelKey(left) || !hasOnlyLabelKey(right)) {
        return false;
      }

      try {
        const labels = getLinguisticOrdinalEvaluationLabels(expressionDomain);
        const normalizedLeft = normalizeLinguisticOrdinalEvaluationValue({
          value: left,
          labels,
        });
        const normalizedRight = normalizeLinguisticOrdinalEvaluationValue({
          value: right,
          labels,
        });

        return normalizedLeft.labelKey === normalizedRight.labelKey;
      } catch {
        return false;
      }

    case "linguisticFuzzy":
      if (hasOnlyLabelKey(left) && hasOnlyLabelKey(right)) {
        try {
          const labels = getLinguisticFuzzyEvaluationLabels(expressionDomain);
          const normalizedLeft = normalizeLinguisticFuzzyEvaluationValue({
            value: left,
            labels,
          });
          const normalizedRight = normalizeLinguisticFuzzyEvaluationValue({
            value: right,
            labels,
          });

          return normalizedLeft.labelKey === normalizedRight.labelKey;
        } catch {
          return false;
        }
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
