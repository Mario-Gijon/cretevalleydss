import {
  computeBwmCollectiveWeightsFlow,
  getBwmWeightsPayload,
  saveBwmWeightsDraftFlow,
  submitBwmWeightsFlow,
} from "../issue.weights.js";

/**
 * Handlers de pesos BWM (incluye variantes que comparten flujo BWM).
 */
export const bwmWeightEvaluationHandlers = Object.freeze({
  getPayload: getBwmWeightsPayload,
  saveDraft: saveBwmWeightsDraftFlow,
  submit: submitBwmWeightsFlow,
  compute: computeBwmCollectiveWeightsFlow,
});
