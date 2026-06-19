import { validateAndNormalizeCriterionMapParameter } from "../../handlers/criterionMapParameter.js";

export const selectCriterionParameterStructure = Object.freeze({
  key: "selectCriterion",
  validateAndNormalize: validateAndNormalizeCriterionMapParameter,
});
