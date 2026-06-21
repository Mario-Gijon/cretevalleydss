import { validateIntegerGlobalParameter } from "./validate.js";

export const integerGlobalParameterStructure = Object.freeze({
  key: "integerGlobal",
  validateAndNormalize: validateIntegerGlobalParameter,
});
