import { validateFuzzyArrayGlobalParameter } from "./validate.js";

export const fuzzyArrayGlobalParameterStructure = Object.freeze({
  key: "fuzzyArrayGlobal",
  validateAndNormalize: validateFuzzyArrayGlobalParameter,
});
