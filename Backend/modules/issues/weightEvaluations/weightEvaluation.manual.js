import {
  computeManualCollectiveWeightsFlow,
  getManualWeightsPayload,
  saveManualWeightsDraftFlow,
  submitManualWeightsFlow,
} from "../issue.weights.js";

/**
 * Handlers de pesos manuales (incluye variantes que comparten flujo manual).
 */
export const manualWeightEvaluationHandlers = Object.freeze({
  getPayload: getManualWeightsPayload,
  saveDraft: saveManualWeightsDraftFlow,
  submit: submitManualWeightsFlow,
  compute: computeManualCollectiveWeightsFlow,
});
