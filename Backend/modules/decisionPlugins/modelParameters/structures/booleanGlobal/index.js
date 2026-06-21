import { validateBooleanGlobalParameter } from "./validate.js";

export const booleanGlobalParameterStructure = Object.freeze({
  key: "booleanGlobal",
  validateAndNormalize: validateBooleanGlobalParameter,
});
