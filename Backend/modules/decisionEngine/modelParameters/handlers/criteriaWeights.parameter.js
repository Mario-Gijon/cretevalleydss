import {
  WEIGHT_SUM_TOLERANCE,
  buildEqualCrispWeights,
  isWithinRange,
  normalizeNumberValue,
  toInvalid,
  toValid,
} from "../modelParameter.shared.js";

export const validateAndNormalizeCriteriaWeightsParameter = ({ value, parameter, context }) => {
  const restrictions = parameter?.restrictions || {};

  let candidate = value;
  if (typeof candidate === "string" && candidate.trim().toLowerCase() === "equal") {
    candidate = buildEqualCrispWeights(context.leafCriteriaCount);
  }

  if (!Array.isArray(candidate)) {
    return toInvalid("must be an array of numbers", candidate);
  }

  if (candidate.length !== context.leafCriteriaCount) {
    return toInvalid(
      `must contain exactly ${context.leafCriteriaCount} values`,
      candidate
    );
  }

  const normalized = [];
  for (let index = 0; index < candidate.length; index += 1) {
    const num = normalizeNumberValue(candidate[index]);
    if (num === null) {
      return toInvalid(`[${index}] must be a finite number`, candidate[index]);
    }

    if (!isWithinRange(num, restrictions)) {
      return toInvalid(
        `[${index}] must be between ${restrictions.min ?? "-∞"} and ${restrictions.max ?? "+∞"}`,
        candidate[index]
      );
    }

    normalized.push(num);
  }

  if (normalized.some((item) => item < 0)) {
    return toInvalid("must contain only values greater than or equal to 0", candidate);
  }

  const total = normalized.reduce((sum, item) => sum + item, 0);
  if (total <= 0) {
    return toInvalid("must contain at least one value greater than 0", candidate);
  }

  if (
    typeof restrictions.sum === "number" &&
    Math.abs(total - restrictions.sum) > WEIGHT_SUM_TOLERANCE
  ) {
    return toInvalid(`must sum to ${restrictions.sum}`, candidate);
  }

  return toValid(normalized);
};
