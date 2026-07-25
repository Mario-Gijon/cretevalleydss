import { resolveRequireValue } from "../../shared/resolveRequireValue.js";
import { normalizePayload } from "./operations/normalizePayload.js";
import { resolveCriteria } from "./operations/resolveCriteria.js";

export const saveManualCriteriaWeightsPayload = ({
  payload,
  decisionContext,
  mode,
}) => {
  const requireValue = resolveRequireValue(mode);
  const criteria = resolveCriteria({ decisionContext });

  return normalizePayload({
    payload,
    criteria,
    requireValue,
  });
};
