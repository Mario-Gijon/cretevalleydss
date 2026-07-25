import { buildEmptyPayload } from "./operations/buildEmptyPayload.js";
import { normalizePayload } from "./operations/normalizePayload.js";
import { resolveCriteria } from "./operations/resolveCriteria.js";

export const getBestWorstCriteriaPayload = async ({
  payload,
  decisionContext,
}) => {
  if (payload === null || payload === undefined) {
    const criteria = resolveCriteria({ decisionContext });
    return buildEmptyPayload({ criteria });
  }

  return normalizePayload({
    payload,
    decisionContext,
    requireValue: false,
  });
};
