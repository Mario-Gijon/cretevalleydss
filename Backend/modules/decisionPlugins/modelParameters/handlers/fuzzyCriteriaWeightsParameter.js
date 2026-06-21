import { buildEqualFuzzyWeights } from "../criteriaWeightDefaults.js";
import { validateAndNormalizeFuzzyCriteriaWeightArray } from "../criteriaWeightValues.js";
import { toInvalid, toValid } from "../parameterValidationResult.js";

export const validateAndNormalizeFuzzyCriteriaWeightsParameter = ({ value, context }) => {
  const criterionCount = context.leafCriteria.length;
  let candidate = value;
  if (typeof candidate === "string" && candidate.trim().toLowerCase() === "equal") {
    candidate = buildEqualFuzzyWeights(criterionCount);
  }

  const normalizedResult = validateAndNormalizeFuzzyCriteriaWeightArray({
    value: candidate,
    expectedLength: criterionCount,
    valueCount: 3,
    min: 0,
    max: 1,
    requireNonDecreasing: true,
    enforceMiddleSum: true,
    middleIndex: 1,
    middleSumTarget: 1,
  });

  if (!normalizedResult.ok) {
    const { code, index } = normalizedResult.error;

    if (code === "notArray") {
      return toInvalid("must be an array of fuzzy triples", candidate);
    }

    if (code === "lengthMismatch") {
      return toInvalid(`must contain exactly ${criterionCount} fuzzy values`, candidate);
    }

    if (code === "tupleLengthMismatch") {
      return toInvalid(`[${index}] must be an array [l,m,u]`, candidate[index]);
    }

    if (code === "tupleNonFinite") {
      return toInvalid(
        `[${index}] must contain finite numeric values`,
        candidate[index]
      );
    }

    if (code === "tupleOutOfRange" || code === "tupleNotNonDecreasing") {
      return toInvalid(
        `[${index}] must satisfy 0 <= l <= m <= u <= 1`,
        candidate[index]
      );
    }

    if (code === "middleSumMismatch") {
      return toInvalid("middle values must sum to 1", candidate);
    }

    return toInvalid("is invalid", candidate);
  }

  return toValid(normalizedResult.value);
};
