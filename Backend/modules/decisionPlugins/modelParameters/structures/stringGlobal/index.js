import { validateStringGlobalParameter } from "./validate.js";

export const stringGlobalParameterStructure = Object.freeze({
  key: "stringGlobal",
  validateAndNormalize: validateStringGlobalParameter,
});
