import { validateAndNormalizeArrayParameter } from "../../handlers/array.parameter.js";

export const arrayPerCriterionParameterStructure = Object.freeze({
  key: "arrayPerCriterion",
  validateAndNormalize: validateAndNormalizeArrayParameter,
});
