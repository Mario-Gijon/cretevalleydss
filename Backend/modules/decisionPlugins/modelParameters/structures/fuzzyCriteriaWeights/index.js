import { validateAndNormalizeFuzzyCriteriaWeightsParameter } from "../../handlers/fuzzyCriteriaWeights.parameter.js";

export const fuzzyCriteriaWeightsParameterStructure = Object.freeze({
  key: "fuzzyCriteriaWeights",
  validateAndNormalize: validateAndNormalizeFuzzyCriteriaWeightsParameter,
});
