import { validateExpressionDomainEvaluation } from "../../../../../expressionDomains";

export const validateAlternativeCriteriaMatrixValue = ({
  value,
  expressionDomain,
  alternativeName,
  criterionName,
}) => {
  if (value === "") {
    return null;
  }

  try {
    validateExpressionDomainEvaluation({
      value,
      expressionDomain,
    });
  } catch (validationError) {
    return {
      alternativeName,
      criterionName,
      message:
        validationError instanceof Error
          ? validationError.message
          : "Value is invalid.",
    };
  }

  return null;
};
