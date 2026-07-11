import { getExpressionDomainTypeOrThrow } from "../expressionDomainTypeCatalog.js";
import { getNumericDiscreteEvaluationDefinition } from "../types/numericDiscrete/evaluation.js";

const PAIRWISE_REFLECTION_INCOMPATIBLE_MESSAGE =
  "This discrete domain cannot be used for pairwise comparisons because some reflected values do not align with its step.";

export const assertPairwiseReflectionCompatible = (expressionDomain) => {
  const typeKey = expressionDomain?.typeKey;

  if (typeof typeKey !== "string" || typeKey.trim() === "") {
    throw new Error("expressionDomain.typeKey is required.");
  }

  const normalizedTypeKey = typeKey.trim();
  getExpressionDomainTypeOrThrow(normalizedTypeKey);

  if (normalizedTypeKey !== "numericDiscrete") {
    return expressionDomain;
  }

  const definition = getNumericDiscreteEvaluationDefinition(expressionDomain);
  const spanRatio = (definition.max - definition.min) / definition.step;
  const nearestInteger = Math.round(spanRatio);

  if (Math.abs(spanRatio - nearestInteger) > 1e-9) {
    throw new Error(PAIRWISE_REFLECTION_INCOMPATIBLE_MESSAGE);
  }

  return expressionDomain;
};

