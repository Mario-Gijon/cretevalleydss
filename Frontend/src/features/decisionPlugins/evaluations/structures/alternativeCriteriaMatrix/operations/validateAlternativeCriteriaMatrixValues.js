import { validateExpressionDomainEvaluation } from "../../../../../expressionDomains";

export const buildAlternativeCriteriaMatrixCellKey = (rowId, criterionId) =>
  `${rowId}::${criterionId}`;

export const validateAlternativeCriteriaMatrixValue = ({
  value,
  expressionDomain,
  alternativeName,
  criterionName,
}) => {
  if (value === "" || value === null || value === undefined) {
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

export const buildAlternativeCriteriaMatrixErrorMap = (errors) =>
  errors.reduce((errorMap, errorItem) => {
    errorMap[
      buildAlternativeCriteriaMatrixCellKey(errorItem.rowId, errorItem.criterionId)
    ] = errorItem.message;
    return errorMap;
  }, {});
