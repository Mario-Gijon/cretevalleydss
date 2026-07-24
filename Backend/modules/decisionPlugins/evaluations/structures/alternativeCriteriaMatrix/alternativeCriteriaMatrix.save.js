import { resolveRequireValueFromModeOrThrow } from "../../shared/expressionDomainEvaluationPayload.js";
import { normalizeAlternativeCriteriaMatrix } from "./operations/normalizeAlternativeCriteriaMatrix.js";

export const saveAlternativeCriteriaMatrixPayload = async ({
  payload,
  decisionContext,
  mode,
}) => {
  const requireValue = resolveRequireValueFromModeOrThrow(mode);
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
