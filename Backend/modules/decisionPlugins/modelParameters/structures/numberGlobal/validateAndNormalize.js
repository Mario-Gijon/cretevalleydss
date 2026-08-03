import { normalizeNumberValue } from "../../../../modelParameters/parameterValues.js";
import { toInvalid, toValid } from "../../parameterValidationResult.js";

export const validateAndNormalizeNumberGlobal = ({ value, parameter }) => {
  const normalizedValue = normalizeNumberValue(value);
  if (normalizedValue === null) {
    return toInvalid("must be a finite number", value);
  }

  if (parameter?.valueType === "integer" && !Number.isInteger(normalizedValue)) {
    return toInvalid("must be an integer", value);
  }

  const { min = null, max = null, allowed = null } = parameter?.restrictions || {};
  if (min !== null && normalizedValue < min) {
    return toInvalid(`must be greater than or equal to ${min}`, value);
  }
  if (max !== null && normalizedValue > max) {
    return toInvalid(`must be less than or equal to ${max}`, value);
  }
  if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(normalizedValue)) {
    return toInvalid("must be one of the declared allowed values", value);
  }

  return toValid(normalizedValue);
};
