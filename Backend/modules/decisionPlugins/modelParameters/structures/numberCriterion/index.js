import { validateAndNormalizeCriterionMapParameter } from "../../handlers/criterionMapParameter.js";

export const numberCriterionParameterStructure = Object.freeze({
  key: "numberCriterion",
  validateAndNormalize: validateAndNormalizeCriterionMapParameter,
});
