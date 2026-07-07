import { getExpressionDomainTypeEntryOrThrow } from "./expressionDomainTypeRegistry";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const requireTypeKey = (expressionDomain) => {
  const typeKey = expressionDomain?.typeKey;

  if (typeof typeKey !== "string" || typeKey.trim() === "") {
    throw new Error("expressionDomain.typeKey is required.");
  }

  return typeKey.trim();
};

const getExpressionDomainEvaluationValidator = (typeKey) => {
  const entry = getExpressionDomainTypeEntryOrThrow(typeKey);

  if (typeof entry.validateEvaluation !== "function") {
    throw new Error(
      `Expression-domain type "${typeKey}" does not implement frontend validateEvaluation.`
    );
  }

  return entry.validateEvaluation;
};

export const validateExpressionDomainEvaluation = ({
  value,
  expressionDomain,
} = {}) => {
  if (!isPlainObject(expressionDomain)) {
    throw new Error("expressionDomain must be an object.");
  }

  const typeKey = requireTypeKey(expressionDomain);
  const validateEvaluation = getExpressionDomainEvaluationValidator(typeKey);

  return validateEvaluation({
    value,
    expressionDomain,
  });
};

