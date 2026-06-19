import { validateAndNormalizeArrayParameter } from "../../handlers/arrayParameter.js";

export const arrayPerCriterionParameterStructure = Object.freeze({
  key: "arrayPerCriterion",
  validateAndNormalize: validateAndNormalizeArrayParameter,
});
