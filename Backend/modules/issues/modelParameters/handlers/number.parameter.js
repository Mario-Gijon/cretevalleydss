import {
  isAllowedValue,
  isWithinRange,
  normalizeNumberValue,
  toInvalid,
  toValid,
} from "../modelParameter.shared.js";

export const validateAndNormalizeNumberParameter = ({ value, parameter }) => {
  const restrictions = parameter?.restrictions || {};
  const normalizedNumber = normalizeNumberValue(value);

  if (normalizedNumber === null) {
    return toInvalid("must be a finite number", value);
  }

  if (!isWithinRange(normalizedNumber, restrictions)) {
    return toInvalid(
      `must be between ${restrictions.min ?? "-∞"} and ${restrictions.max ?? "+∞"}`,
      value
    );
  }

  if (!isAllowedValue(normalizedNumber, restrictions.allowed)) {
    return toInvalid("contains a value outside allowed options", value);
  }

  return toValid(normalizedNumber);
};
