import { validateAndNormalizeNumberParameter } from "./number.parameter.js";
import { toInvalid } from "../modelParameter.shared.js";

export const validateAndNormalizeIntegerParameter = ({ value, parameter }) => {
  const numberResult = validateAndNormalizeNumberParameter({ value, parameter });
  if (!numberResult.ok) {
    return numberResult;
  }

  if (!Number.isInteger(numberResult.value)) {
    return toInvalid("must be an integer", value);
  }

  return numberResult;
};
