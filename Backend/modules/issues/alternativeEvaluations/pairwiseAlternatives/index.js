import { EVALUATION_STRUCTURES } from "../alternativeEvaluation.constants.js";

import {
  buildPairwiseResolutionInput,
  getPairwiseEvaluationPayload,
  savePairwiseEvaluationDrafts,
  submitPairwiseEvaluations,
} from "./pairwiseAlternatives.operations.js";
import { buildInitialPairwiseEvaluations } from "./pairwiseAlternatives.initial.js";

export const pairwiseAlternativeEvaluations = Object.freeze({
  key: EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
  read: getPairwiseEvaluationPayload,
  saveDraft: savePairwiseEvaluationDrafts,
  submit: submitPairwiseEvaluations,
  buildInitial: buildInitialPairwiseEvaluations,
  buildResolutionInput: buildPairwiseResolutionInput,
});
