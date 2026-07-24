import { buildEmptyAlternativeCriteriaMatrix } from "./operations/buildEmptyAlternativeCriteriaMatrix.js";
import { normalizeAlternativeCriteriaMatrix } from "./operations/normalizeAlternativeCriteriaMatrix.js";

export const getAlternativeCriteriaMatrixPayload = async ({
  payload,
  decisionContext,
}) => {
  const alternatives = decisionContext.alternatives;
  const criteria = decisionContext.leafCriteria;
  let resolvedPayload;

  if (payload === null || payload === undefined) {
    resolvedPayload = buildEmptyAlternativeCriteriaMatrix({
      alternatives,
      criteria,
    });
  } else {
    resolvedPayload = normalizeAlternativeCriteriaMatrix({
      payload,
      alternatives,
      criteria,
      requireValue: false,
    });
  }

  return resolvedPayload;
};
