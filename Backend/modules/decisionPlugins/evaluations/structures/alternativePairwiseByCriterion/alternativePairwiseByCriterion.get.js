import { buildEmptyPayload } from "./operations/buildEmptyPayload.js";
import { normalizePayload } from "./operations/normalizePayload.js";
import { resolveItems } from "./operations/resolveItems.js";

export const getAlternativePairwiseByCriterionPayload = async ({
  payload,
  decisionContext,
}) => {
  const { alternatives, criterionIds } = await resolveItems({
    decisionContext,
  });

  if (payload === null || payload === undefined) {
    return buildEmptyPayload({
      criterionIds,
      alternatives,
    });
  }

  return normalizePayload({
    payload,
    decisionContext,
    requireValue: false,
  });
};
