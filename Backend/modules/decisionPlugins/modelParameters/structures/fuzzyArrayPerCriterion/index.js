import { validateFuzzyArrayPerCriterionParameter } from "./validate.js";

export const fuzzyArrayPerCriterionParameterStructure = Object.freeze({
  key: "fuzzyArrayPerCriterion",
  validateAndNormalize: validateFuzzyArrayPerCriterionParameter,
});
