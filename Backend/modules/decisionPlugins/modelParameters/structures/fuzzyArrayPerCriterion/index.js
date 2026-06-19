import { validateAndNormalizeFuzzyArrayParameter } from "../../handlers/fuzzyArray.parameter.js";

export const fuzzyArrayPerCriterionParameterStructure = Object.freeze({
  key: "fuzzyArrayPerCriterion",
  validateAndNormalize: validateAndNormalizeFuzzyArrayParameter,
});
