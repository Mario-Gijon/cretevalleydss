import { validateAndNormalizeCriterionMapParameter } from "../../handlers/criterionMapParameter.js";

export const criterionMapParameterStructure = Object.freeze({
  key: "criterionMap",
  validateAndNormalize: validateAndNormalizeCriterionMapParameter,
});
