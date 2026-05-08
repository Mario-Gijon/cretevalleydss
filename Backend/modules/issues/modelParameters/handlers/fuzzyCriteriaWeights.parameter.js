import {
  WEIGHT_SUM_TOLERANCE,
  buildEqualFuzzyWeights,
  normalizeNumberValue,
  toInvalid,
  toValid,
} from "../modelParameter.shared.js";

export const validateAndNormalizeFuzzyCriteriaWeightsParameter = ({ value, context }) => {
  let candidate = value;
  if (typeof candidate === "string" && candidate.trim().toLowerCase() === "equal") {
    candidate = buildEqualFuzzyWeights(context.leafCriteriaCount);
  }

  if (!Array.isArray(candidate)) {
    return toInvalid("must be an array of fuzzy triples", candidate);
  }

  if (candidate.length !== context.leafCriteriaCount) {
    return toInvalid(
      `must contain exactly ${context.leafCriteriaCount} fuzzy values`,
      candidate
    );
  }

  const normalized = [];
  for (let index = 0; index < candidate.length; index += 1) {
    const triangle = candidate[index];
    if (!Array.isArray(triangle) || triangle.length !== 3) {
      return toInvalid(`[${index}] must be an array [l,m,u]`, triangle);
    }

    const [left, middle, right] = triangle.map((item) => normalizeNumberValue(item));
    if ([left, middle, right].some((item) => item === null)) {
      return toInvalid(`[${index}] must contain finite numeric values`, triangle);
    }

    if (!(0 <= left && left <= middle && middle <= right && right <= 1)) {
      return toInvalid(`[${index}] must satisfy 0 <= l <= m <= u <= 1`, triangle);
    }

    normalized.push([left, middle, right]);
  }

  const middleSum = normalized.reduce((sum, [, middle]) => sum + middle, 0);
  if (Math.abs(middleSum - 1) > WEIGHT_SUM_TOLERANCE) {
    return toInvalid("middle values must sum to 1", candidate);
  }

  return toValid(normalized);
};
