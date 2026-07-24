import {
  normalizeAlternativePairwiseEvaluation,
  resolveRequireValueFromModeOrThrow,
} from "./operations/normalizeAlternativePairwiseEvaluation.js";

export const saveAlternativePairwiseByCriterionPayload = async ({
  payload,
  decisionContext,
  mode,
}) => {
  const requireValue = resolveRequireValueFromModeOrThrow(mode);

  return normalizeAlternativePairwiseEvaluation({
    payload,
    decisionContext,
    requireValue,
  });
};
