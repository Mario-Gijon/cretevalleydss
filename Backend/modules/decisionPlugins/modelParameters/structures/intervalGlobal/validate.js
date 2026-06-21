import { normalizeNumberValue } from "../../parameterValues.js";
import { isWithinRange, validateOrderedRule } from "../../parameterRestrictions.js";
import { toInvalid, toValid } from "../../parameterValidationResult.js";

export const validateIntervalGlobalParameter = ({ value, parameter }) => {
  const restrictions = parameter?.restrictions || {};

  if (!Array.isArray(value) || value.length !== 2) {
    return toInvalid("must be an array of exactly 2 numeric values", value);
  }

  const normalized = value.map((item) => normalizeNumberValue(item));
  if (normalized.some((item) => item === null)) {
    return toInvalid("must contain finite numeric values", value);
  }

  if (normalized.some((item) => !isWithinRange(item, restrictions))) {
    return toInvalid(
      `must be between ${restrictions.min ?? "-∞"} and ${restrictions.max ?? "+∞"}`,
      value
    );
  }

  if (restrictions.ordered && !validateOrderedRule(normalized, restrictions.ordered)) {
    return toInvalid(`must satisfy ordered rule '${restrictions.ordered}'`, value);
  }

  return toValid(normalized);
};
