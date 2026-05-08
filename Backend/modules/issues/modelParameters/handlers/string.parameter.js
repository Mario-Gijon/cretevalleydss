import { isAllowedValue, toInvalid, toValid } from "../modelParameter.shared.js";

export const validateAndNormalizeStringParameter = ({ value, parameter }) => {
  const restrictions = parameter?.restrictions || {};

  if (typeof value !== "string") {
    return toInvalid("must be a string", value);
  }

  const normalized = value.trim();
  if (!isAllowedValue(normalized, restrictions.allowed)) {
    return toInvalid("contains a value outside allowed options", value);
  }

  return toValid(normalized);
};
