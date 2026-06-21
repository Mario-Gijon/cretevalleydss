import { validateNumberGlobalParameter } from "./validate.js";

export const numberGlobalParameterStructure = Object.freeze({
  key: "numberGlobal",
  validateAndNormalize: validateNumberGlobalParameter,
});
