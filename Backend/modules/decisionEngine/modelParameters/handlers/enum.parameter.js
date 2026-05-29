import { isAllowedValue, toInvalid, toValid } from "../modelParameter.shared.js";

export const validateAndNormalizeEnumParameter = ({ value, parameter }) => {
  const restrictions = parameter?.restrictions || {};
  const valueType = String(parameter?.valueType || "").trim().toLowerCase();
  let normalized = value;

  if (valueType === "number") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return toInvalid("must be a finite number", value);
    }
    normalized = parsed;
  } else if (valueType === "integer") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      return toInvalid("must be an integer", value);
    }
    normalized = parsed;
  } else if (valueType === "boolean") {
    if (typeof value === "boolean") {
      normalized = value;
    } else if (typeof value === "string") {
      const candidate = value.trim().toLowerCase();
      if (candidate === "true") normalized = true;
      else if (candidate === "false") normalized = false;
      else return toInvalid("must be a boolean", value);
    } else {
      return toInvalid("must be a boolean", value);
    }
  } else if (valueType === "string") {
    if (typeof value !== "string") {
      return toInvalid("must be a string", value);
    }
    normalized = value.trim();
  }

  if (!isAllowedValue(normalized, restrictions.allowed)) {
    return toInvalid("must be one of the allowed enum values", normalized);
  }

  return toValid(normalized);
};
