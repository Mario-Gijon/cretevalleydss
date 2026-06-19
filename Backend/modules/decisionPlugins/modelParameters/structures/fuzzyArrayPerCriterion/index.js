import { validateAndNormalizeFuzzyArrayParameter } from "../../handlers/fuzzyArrayParameter.js";

export const fuzzyArrayPerCriterionParameterStructure = Object.freeze({
  key: "fuzzyArrayPerCriterion",
  validateAndNormalize: validateAndNormalizeFuzzyArrayParameter,
});
