import {
  normalizeBestWorstCriteriaEvaluation,
} from "./operations/normalizeBestWorstCriteriaEvaluation.js";
import {
  validateBestWorstSaveModeOrThrow,
  validateSubmittedBestWorstCriteriaOrThrow,
} from "./operations/validateBestWorstCriteriaEvaluation.js";

export const saveBestWorstCriteriaPayload = async ({
  payload,
  decisionContext,
  mode,
}) => {
  validateBestWorstSaveModeOrThrow(mode);

  const normalized = await normalizeBestWorstCriteriaEvaluation({
    payload,
    decisionContext,
  });

  if (mode === "submit") {
    validateSubmittedBestWorstCriteriaOrThrow({
      criterionItems: normalized.criterionItems,
      payload: normalized.payload,
    });
  }

  return normalized.payload;
};
