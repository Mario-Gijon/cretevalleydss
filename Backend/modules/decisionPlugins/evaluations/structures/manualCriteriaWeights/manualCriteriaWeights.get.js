import { buildEmptyPayload } from "./operations/buildEmptyPayload.js";
import { normalizePayload } from "./operations/normalizePayload.js";
import { resolveCriteria } from "./operations/resolveCriteria.js";

export const getManualCriteriaWeightsPayload = ({
  payload,
  decisionContext,
}) => {
  const criteria = resolveCriteria({ decisionContext });

  if (payload === null || payload === undefined) {
    return buildEmptyPayload({ criteria });
  }

  return normalizePayload({
    payload,
    criteria,
    requireValue: false,
  });
};
