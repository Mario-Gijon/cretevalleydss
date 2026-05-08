import { isAllowedValue, toInvalid, toValid } from "../modelParameter.shared.js";

export const validateAndNormalizeEnumParameter = ({ value, parameter }) => {
  const restrictions = parameter?.restrictions || {};

  if (!isAllowedValue(value, restrictions.allowed)) {
    return toInvalid("must be one of the allowed enum values", value);
  }

  return toValid(value);
};
