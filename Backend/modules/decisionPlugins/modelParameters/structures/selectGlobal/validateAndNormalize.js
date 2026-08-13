import { validateAndNormalizeSelectValue } from "../../selectValueValidation.js";

export const validateAndNormalizeSelectGlobal = ({ value, parameter }) => {
  const { valueType, restrictions } = parameter || {};

  return validateAndNormalizeSelectValue({
    value,
    valueType,
    allowed: restrictions?.allowed,
  });
};
