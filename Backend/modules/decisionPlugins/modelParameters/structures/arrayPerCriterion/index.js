import { validateArrayPerCriterionParameter } from "./validate.js";

export const arrayPerCriterionParameterStructure = Object.freeze({
  key: "arrayPerCriterion",
  validateAndNormalize: validateArrayPerCriterionParameter,
});
