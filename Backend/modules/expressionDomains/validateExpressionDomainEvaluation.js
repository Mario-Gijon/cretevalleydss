import { getExpressionDomainTypeOrThrow } from "../decisionPlugins/expressionDomains/index.js";
import { createBadRequestError } from "../../utils/common/errors.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const requireTypeKeyOrThrow = (expressionDomain) => {
  const typeKey = expressionDomain?.typeKey;

  if (typeof typeKey !== "string" || typeKey.trim() === "") {
    throw createBadRequestError("expressionDomain.typeKey is required.", {
      field: "expressionDomain",
    });
  }

  return typeKey.trim();
};

export const validateExpressionDomainEvaluationOrThrow = ({
  value,
  expressionDomain,
}) => {
  if (!isPlainObject(expressionDomain)) {
    throw createBadRequestError("expressionDomain must be an object.", {
      field: "expressionDomain",
    });
  }

  const typeKey = requireTypeKeyOrThrow(expressionDomain);
  const domainType = getExpressionDomainTypeOrThrow(typeKey);

  return domainType.validateEvaluation({
    value,
    expressionDomain,
  });
};
