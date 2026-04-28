import {
  getDirectEvaluationPayload,
  saveDirectEvaluationDrafts,
  submitDirectEvaluationFlow,
} from "../issue.evaluations.js";

/**
 * Handlers de evaluación alternativa directa.
 *
 * Se reutilizan los flows existentes sin alterar su comportamiento.
 */
export const directAlternativeEvaluationHandlers = Object.freeze({
  getPayload: getDirectEvaluationPayload,
  saveDraft: saveDirectEvaluationDrafts,
  submit: submitDirectEvaluationFlow,
});
