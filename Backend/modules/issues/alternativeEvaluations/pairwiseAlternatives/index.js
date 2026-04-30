import {
  buildPairwiseResolutionInput,
  getPairwiseEvaluationPayload,
  savePairwiseEvaluationDrafts,
  submitPairwiseEvaluations,
} from "./pairwiseAlternatives.operations.js";
import { buildInitialPairwiseEvaluations } from "./pairwiseAlternatives.initial.js";
import { buildPairwiseAlternativesResolutionData } from "./pairwiseAlternatives.resolutionData.js";

export const pairwiseAlternativeEvaluations = Object.freeze({
  read: getPairwiseEvaluationPayload,
  saveDraft: savePairwiseEvaluationDrafts,
  submit: submitPairwiseEvaluations,
  buildInitial: buildInitialPairwiseEvaluations,
  buildResolutionInput: buildPairwiseResolutionInput,
  buildResolutionData: buildPairwiseAlternativesResolutionData,
});
