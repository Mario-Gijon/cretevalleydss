import { validateAndNormalizeCriterionMapParameter } from "../../handlers/criterionMap.parameter.js";

export const selectCriterionParameterStructure = Object.freeze({
  key: "selectCriterion",
  validateAndNormalize: validateAndNormalizeCriterionMapParameter,
});
