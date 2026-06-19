import { validateAndNormalizeFuzzyArrayParameter } from "../../handlers/fuzzyArray.parameter.js";

export const fuzzyArrayGlobalParameterStructure = Object.freeze({
  key: "fuzzyArrayGlobal",
  validateAndNormalize: validateAndNormalizeFuzzyArrayParameter,
});
