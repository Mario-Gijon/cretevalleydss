import { resolveAlternativeCriteriaMatrixItems } from "./operations/resolveAlternativeCriteriaMatrixItems.js";
import { buildEmptyAlternativeCriteriaMatrix } from "./operations/buildEmptyAlternativeCriteriaMatrix.js";
import { normalizeAlternativeCriteriaMatrix } from "./operations/normalizeAlternativeCriteriaMatrix.js";

export const getAlternativeCriteriaMatrixPayload = async ({
  payload,
  decisionContext,
}) => {
  const {
    alternatives,
    criteria,
  } = await resolveAlternativeCriteriaMatrixItems({
    decisionContext,
  });

  if (payload === null || payload === undefined) {
    return buildEmptyAlternativeCriteriaMatrix({
      alternatives,
      criteria,
    });
  }

  return normalizeAlternativeCriteriaMatrix({
    payload,
    decisionContext,
    requireValue: false,
  });
};
