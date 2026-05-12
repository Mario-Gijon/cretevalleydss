import {
  EVALUATION_STAGES,
  EVALUATION_STRUCTURE_KEYS,
} from "../../evaluation.constants.js";

export const criteriaPairwiseMatrixStructure = Object.freeze({
  key: EVALUATION_STRUCTURE_KEYS.CRITERIA_PAIRWISE_MATRIX,
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,

  async init() {
    return { comparisons: {} };
  },

  async get({ storedEvaluation }) {
    return storedEvaluation?.payload ?? { comparisons: {} };
  },

  async send({ payload }) {
    return payload;
  },

  async submit({ payload }) {
    return payload;
  },
});
