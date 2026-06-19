import { validateAndNormalizeCriteriaWeightsParameter } from "../../handlers/criteriaWeights.parameter.js";

export const criteriaWeightsParameterStructure = Object.freeze({
  key: "criteriaWeights",
  validateAndNormalize: validateAndNormalizeCriteriaWeightsParameter,
});
