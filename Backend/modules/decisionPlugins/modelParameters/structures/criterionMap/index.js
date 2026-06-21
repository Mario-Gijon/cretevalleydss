import { validateCriterionMapParameter } from "./validate.js";

export const criterionMapParameterStructure = Object.freeze({
  key: "criterionMap",
  validateAndNormalize: validateCriterionMapParameter,
});
