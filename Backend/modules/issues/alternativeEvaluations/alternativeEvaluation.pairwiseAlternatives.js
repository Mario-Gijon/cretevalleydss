import {
  getPairwiseEvaluationPayload,
  savePairwiseEvaluationDrafts,
  submitPairwiseEvaluationFlow,
} from "../issue.evaluations.js";

/**
 * Handlers de evaluación alternativa pairwise.
 *
 * Se reutilizan los flows existentes sin alterar su comportamiento.
 */
export const pairwiseAlternativesEvaluationHandlers = Object.freeze({
  getPayload: getPairwiseEvaluationPayload,
  saveDraft: savePairwiseEvaluationDrafts,
  submit: submitPairwiseEvaluationFlow,
});
