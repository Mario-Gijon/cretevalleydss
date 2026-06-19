import { validateAndNormalizeFuzzyCriteriaWeightsParameter } from "../../handlers/fuzzyCriteriaWeightsParameter.js";

export const fuzzyCriteriaWeightsParameterStructure = Object.freeze({
  key: "fuzzyCriteriaWeights",
  validateAndNormalize: validateAndNormalizeFuzzyCriteriaWeightsParameter,
});
