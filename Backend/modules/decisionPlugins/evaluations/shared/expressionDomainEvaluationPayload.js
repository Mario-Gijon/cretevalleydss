import { createBadRequestError } from "../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../utils/common/objects.js";
import { validateExpressionDomainEvaluationOrThrow } from "../../../expressionDomains/validateExpressionDomainEvaluation.js";

export const buildEmptyExpressionDomainEvaluationValue = (
  expressionDomain = null
) => ({
  value: "",
  expressionDomain,
});

export const validateExpressionDomainEvaluationValueOrThrow = ({
  value,
  expressionDomain,
}) =>
  validateExpressionDomainEvaluationOrThrow({
    value,
    expressionDomain,
  });

export const normalizeExpressionDomainEvaluationValueOrThrow = ({
  cell,
  requireValue,
  field,
  expectedExpressionDomain,
  emptyValueMessage,
  invalidValueMessage,
} = {}) => {
  if (!isPlainObject(cell)) {
    throw createBadRequestError(invalidValueMessage, { field });
  }

  const rawValue = cell.value;
  const hasValue = !(rawValue === "" || rawValue === null || rawValue === undefined);

  if (!hasValue) {
    if (requireValue) {
      throw createBadRequestError(emptyValueMessage, {
        field,
      });
    }

    return buildEmptyExpressionDomainEvaluationValue(expectedExpressionDomain);
  }

  const normalizedValue = validateExpressionDomainEvaluationValueOrThrow({
    value: rawValue,
    expressionDomain: expectedExpressionDomain,
  });

  return {
    value: normalizedValue,
    expressionDomain: expectedExpressionDomain,
  };
};
