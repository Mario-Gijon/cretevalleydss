import { buildEmptyPayload } from "./operations/buildEmptyPayload.js";
import { normalizePayload } from "./operations/normalizePayload.js";
import { resolveCriteria } from "./operations/resolveCriteria.js";

export const getCriteriaPairwiseAHPPayload = async ({ payload, decisionContext }) => {
  if (payload === null || payload === undefined) {
    return buildEmptyPayload({ criteria: resolveCriteria({ decisionContext }) });
  }

  return normalizePayload({
    payload,
    decisionContext,
    requireValue: false,
  });
};
