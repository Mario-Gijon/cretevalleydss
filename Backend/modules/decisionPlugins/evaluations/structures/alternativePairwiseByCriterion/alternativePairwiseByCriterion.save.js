import { resolveRequireValue } from "../../shared/resolveRequireValue.js";
import { normalizePayload } from "./operations/normalizePayload.js";

export const saveAlternativePairwiseByCriterionPayload = async ({
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
