import { normalizePayload } from "./operations/normalizePayload.js";
import { resolveRequireValue } from "./operations/resolveRequireValue.js";

export const saveBestWorstCriteriaPayload = async ({
  payload,
  decisionContext,
  mode,
}) => {
  const requireValue = resolveRequireValue(mode);

  return normalizePayload({
    payload,
    decisionContext,
    requireValue,
  });
};
