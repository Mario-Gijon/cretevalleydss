import { buildEqualCrispWeights } from "../../criteriaWeightDefaults.js";
import { validateAndNormalizeCrispCriteriaWeightArray } from "../../criteriaWeightValues.js";
import { toInvalid, toValid } from "../../parameterValidationResult.js";

export const validateCriteriaWeightsParameter = ({ value, parameter, context }) => {
  const restrictions = parameter?.restrictions || {};
  const criterionCount = context.leafCriteria.length;

  let candidate = value;
  if (typeof candidate === "string" && candidate.trim().toLowerCase() === "equal") {
    candidate = buildEqualCrispWeights(criterionCount);
  }

  const normalizedResult = validateAndNormalizeCrispCriteriaWeightArray({
    value: candidate,
    expectedLength: criterionCount,
    min: typeof restrictions.min === "number" ? restrictions.min : null,
    max: typeof restrictions.max === "number" ? restrictions.max : null,
    enforceNonNegative: true,
    requirePositiveTotal: true,
    sumTarget: typeof restrictions.sum === "number" ? restrictions.sum : null,
  });

  if (!normalizedResult.ok) {
    const { code, index } = normalizedResult.error;

    if (code === "notArray") {
      return toInvalid("must be an array of numbers", candidate);
    }
    if (code === "lengthMismatch") {
      return toInvalid(`must contain exactly ${criterionCount} values`, candidate);
    }
    if (code === "nonFinite") {
      return toInvalid(`[${index}] must be a finite number`, candidate[index]);
    }
    if (code === "outOfRange") {
      return toInvalid(
        `[${index}] must be between ${restrictions.min ?? "-∞"} and ${restrictions.max ?? "+∞"}`,
        candidate[index]
      );
    }
    if (code === "nonNegativeViolation") {
      return toInvalid(
        "must contain only values greater than or equal to 0",
        candidate
      );
    }
    if (code === "nonPositiveTotal") {
      return toInvalid(
        "must contain at least one value greater than 0",
        candidate
      );
    }
    if (code === "sumMismatch") {
      return toInvalid(`must sum to ${restrictions.sum}`, candidate);
    }

    return toInvalid("is invalid", candidate);
  }

  return toValid(normalizedResult.value);
};
