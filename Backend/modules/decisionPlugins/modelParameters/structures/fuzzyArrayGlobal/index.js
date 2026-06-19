import { validateAndNormalizeFuzzyArrayParameter } from "../../handlers/fuzzyArrayParameter.js";

export const fuzzyArrayGlobalParameterStructure = Object.freeze({
  key: "fuzzyArrayGlobal",
  validateAndNormalize: validateAndNormalizeFuzzyArrayParameter,
});
