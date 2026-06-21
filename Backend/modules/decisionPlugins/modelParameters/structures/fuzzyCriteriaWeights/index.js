import { validateFuzzyCriteriaWeightsParameter } from "./validate.js";

export const fuzzyCriteriaWeightsParameterStructure = Object.freeze({
  key: "fuzzyCriteriaWeights",
  validateAndNormalize: validateFuzzyCriteriaWeightsParameter,
});
