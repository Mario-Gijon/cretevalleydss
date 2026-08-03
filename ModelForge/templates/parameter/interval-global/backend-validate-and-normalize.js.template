import { normalizeNumberValue } from "../../../../modelParameters/parameterValues.js";
import { toInvalid, toValid } from "../../parameterValidationResult.js";

const satisfiesOrder = ([lower, upper], ordered) =>
  ordered === "strictIncreasing"
    ? lower < upper
    : ordered === "nonDecreasing"
      ? lower <= upper
      : false;

export const validateAndNormalizeIntervalGlobal = ({ value, parameter }) => {
  if (!Array.isArray(value) || value.length !== 2) {
    return toInvalid("must be an array of exactly 2 numeric values", value);
  }

  const normalized = value.map(normalizeNumberValue);
  if (normalized.some((item) => item === null)) {
    return toInvalid("must contain finite numeric values", value);
  }

  const { min = null, max = null, ordered } = parameter?.restrictions || {};
  if (
    normalized.some(
      (item) => (min !== null && item < min) || (max !== null && item > max)
    )
  ) {
    return toInvalid(`must be between ${min ?? "-∞"} and ${max ?? "+∞"}`, value);
  }
  if (!satisfiesOrder(normalized, ordered)) {
    return toInvalid(`must satisfy ordered rule '${ordered}'`, value);
  }

  return toValid(normalized);
};
