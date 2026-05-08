import { isAllowedValue, toInvalid, toValid } from "../modelParameter.shared.js";

export const validateAndNormalizeBooleanParameter = ({ value, parameter }) => {
  const restrictions = parameter?.restrictions || {};

  let normalizedBoolean = null;
  if (typeof value === "boolean") normalizedBoolean = value;
  else if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") normalizedBoolean = true;
    if (normalized === "false") normalizedBoolean = false;
  }

  if (normalizedBoolean === null) {
    return toInvalid("must be a boolean", value);
  }

  if (!isAllowedValue(normalizedBoolean, restrictions.allowed)) {
    return toInvalid("contains a value outside allowed options", value);
  }

  return toValid(normalizedBoolean);
};
