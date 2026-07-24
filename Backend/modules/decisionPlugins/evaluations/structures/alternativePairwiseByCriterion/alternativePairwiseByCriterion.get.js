import {
  resolveAlternativePairwiseItems,
} from "./operations/resolveAlternativePairwiseItems.js";
import {
  normalizeAlternativePairwiseEvaluation,
} from "./operations/normalizeAlternativePairwiseEvaluation.js";
import { buildEmptyAlternativePairwiseEvaluation } from "./operations/buildEmptyAlternativePairwiseEvaluation.js";

export const getAlternativePairwiseByCriterionPayload = async ({
  payload,
  decisionContext,
}) => {
  const { alternatives, criteria, criterionIds } = await resolveAlternativePairwiseItems({
    decisionContext,
  });

  if (payload === null || payload === undefined) {
    return buildEmptyAlternativePairwiseEvaluation({
      criterionIds,
      alternatives,
    });
  }

  return normalizeAlternativePairwiseEvaluation({
    payload,
    decisionContext,
    requireValue: false,
  });
};
