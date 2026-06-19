import { validateAndNormalizeCriterionMapParameter } from "../../handlers/criterionMap.parameter.js";

export const criterionMapParameterStructure = Object.freeze({
  key: "criterionMap",
  validateAndNormalize: validateAndNormalizeCriterionMapParameter,
});
