import { getExpressionDomainTypeOrThrow } from "../decisionPlugins/expressionDomains/index.js";
import { createBadRequestError } from "../../utils/common/errors.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const requireTypeKeyOrThrow = (expressionDomain, field) => {
  const typeKey = expressionDomain?.typeKey;

  if (typeof typeKey !== "string" || typeKey.trim() === "") {
    throw createBadRequestError("expressionDomain.typeKey is required.", {
      field,
    });
  }

  return typeKey.trim();
};

export const validateExpressionDomainEvaluationOrThrow = ({
  value,
  expressionDomain,
  field = "value",
}) => {
  if (!isPlainObject(expressionDomain)) {
    throw createBadRequestError("expressionDomain must be an object.", {
      field,
    });
  }

  const typeKey = requireTypeKeyOrThrow(expressionDomain, field);
  const domainType = getExpressionDomainTypeOrThrow(typeKey);

  return domainType.validateEvaluation({
    value,
    expressionDomain,
    field,
  });
};
