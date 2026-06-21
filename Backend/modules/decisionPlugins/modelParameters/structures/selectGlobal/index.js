import { validateSelectGlobalParameter } from "./validate.js";

export const selectGlobalParameterStructure = Object.freeze({
  key: "selectGlobal",
  validateAndNormalize: validateSelectGlobalParameter,
});
