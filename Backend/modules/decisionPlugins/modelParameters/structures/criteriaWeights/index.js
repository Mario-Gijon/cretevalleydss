import { validateCriteriaWeightsParameter } from "./validate.js";

export const criteriaWeightsParameterStructure = Object.freeze({
  key: "criteriaWeights",
  validateAndNormalize: validateCriteriaWeightsParameter,
});
