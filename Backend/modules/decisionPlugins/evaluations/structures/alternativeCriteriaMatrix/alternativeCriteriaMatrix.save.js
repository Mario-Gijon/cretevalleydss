import { resolveRequireValue } from "../../shared/resolveRequireValue.js";
import { normalizeAlternativeCriteriaMatrix } from "./operations/normalizeAlternativeCriteriaMatrix.js";

export const saveAlternativeCriteriaMatrixPayload = async ({
  payload,
  decisionContext,
  mode,
}) => {
  const requireValue = resolveRequireValue(mode);
  const alternatives = decisionContext.alternatives;
  const criteria = decisionContext.leafCriteria;
  const normalizedPayload = normalizeAlternativeCriteriaMatrix({
    payload,
    alternatives,
    criteria,
    requireValue,
  });

  return normalizedPayload;
};
