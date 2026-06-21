import { validateAndNormalizeNumberParameter } from "../../shared/validateNumberParameter.js";

export const validateNumberGlobalParameter = ({ value, parameter }) =>
  validateAndNormalizeNumberParameter({ value, parameter });
