import { validateNumberCriterionParameter } from "./validate.js";

export const numberCriterionParameterStructure = Object.freeze({
  key: "numberCriterion",
  validateAndNormalize: validateNumberCriterionParameter,
});
