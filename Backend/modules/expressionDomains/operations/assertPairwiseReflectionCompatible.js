import { createBadRequestError } from "../../../utils/common/errors.js";
import { getExpressionDomainTypeOrThrow } from "../expressionDomainTypeCatalog.js";
import { getNumericDiscreteEvaluationDefinition } from "../types/numericDiscrete/evaluation.js";

const PAIRWISE_REFLECTION_INCOMPATIBLE_MESSAGE =
  "This discrete domain cannot be used for pairwise comparisons because some reflected values do not align with its step.";

export const assertPairwiseReflectionCompatible = (expressionDomain) => {
  const typeKey = expressionDomain?.typeKey;

  if (typeof typeKey !== "string" || typeKey.trim() === "") {
    throw createBadRequestError("expressionDomain.typeKey is required.", {
      field: "expressionDomain",
    });
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
    throw createBadRequestError(PAIRWISE_REFLECTION_INCOMPATIBLE_MESSAGE, {
      code: "PAIRWISE_REFLECTION_INCOMPATIBLE_DOMAIN",
      field: "expressionDomain.definition.step",
    });
  }

  return expressionDomain;
};

