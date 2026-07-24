import { validateExpressionDomainEvaluation } from "../../../../../expressionDomains";

export const validateAlternativeCriteriaMatrixValue = ({
  value,
  expressionDomain,
}) => {
  if (value === "") {
    return "";
  }

  try {
    validateExpressionDomainEvaluation({
      value,
      expressionDomain,
    });
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : "Value is invalid.";
  }
};
