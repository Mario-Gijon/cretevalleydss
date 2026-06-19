import { validateAndNormalizeCriteriaWeightsParameter } from "../../handlers/criteriaWeightsParameter.js";

export const criteriaWeightsParameterStructure = Object.freeze({
  key: "criteriaWeights",
  validateAndNormalize: validateAndNormalizeCriteriaWeightsParameter,
});
