import { toInvalid } from "../../parameterValidationResult.js";
import { validateAndNormalizeNumberParameter } from "../../shared/validateNumberParameter.js";

export const validateIntegerGlobalParameter = ({ value, parameter }) => {
  const numberResult = validateAndNormalizeNumberParameter({ value, parameter });
  if (!numberResult.ok) {
    return numberResult;
  }

  if (!Number.isInteger(numberResult.value)) {
    return toInvalid("must be an integer", value);
  }

  return numberResult;
};
