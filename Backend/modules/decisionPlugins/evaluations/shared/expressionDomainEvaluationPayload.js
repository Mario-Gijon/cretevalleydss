import { createBadRequestError } from "../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../utils/common/objects.js";
import { validateExpressionDomainEvaluationOrThrow } from "../../../expressionDomains/validateExpressionDomainEvaluation.js";

const EVALUATION_SAVE_MODES = Object.freeze({
  DRAFT: "draft",
  SUBMIT: "submit",
});

export const buildEmptyExpressionDomainEvaluationValue = (
  expressionDomain = null
) => ({
  value: "",
  expressionDomain,
});

export const resolveRequireValueFromModeOrThrow = (mode) => {
  if (mode === EVALUATION_SAVE_MODES.DRAFT) {
    return false;
  }

  if (mode === EVALUATION_SAVE_MODES.SUBMIT) {
    return true;
  }

  throw createBadRequestError("Unsupported evaluation save mode", {
    field: "mode",
  });
};

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
