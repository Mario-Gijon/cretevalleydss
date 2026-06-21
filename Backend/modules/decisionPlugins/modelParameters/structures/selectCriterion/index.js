import { validateSelectCriterionParameter } from "./validate.js";

export const selectCriterionParameterStructure = Object.freeze({
  key: "selectCriterion",
  validateAndNormalize: validateSelectCriterionParameter,
});
