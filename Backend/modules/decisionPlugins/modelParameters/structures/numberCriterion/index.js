import { validateAndNormalizeCriterionMapParameter } from "../../handlers/criterionMap.parameter.js";

export const numberCriterionParameterStructure = Object.freeze({
  key: "numberCriterion",
  validateAndNormalize: validateAndNormalizeCriterionMapParameter,
});
