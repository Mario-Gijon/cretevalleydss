import { createBadRequestError } from "../../../../utils/common/errors.js";
import {
  getExpressionDomainDefinitionOrThrow,
  normalizeFiniteNumberOrThrow,
} from "../../shared/validation.js";

export const normalizeNumericContinuousEvaluationValue = (value) =>
  normalizeFiniteNumberOrThrow(value, {
    message: "Value must be a finite number.",
    field: "value",
  });

export const getNumericContinuousEvaluationDefinition = (expressionDomain) => {
  const definition = getExpressionDomainDefinitionOrThrow(expressionDomain);
  const min = definition?.min;
  const max = definition?.max;

  if (
    typeof min !== "number" ||
    !Number.isFinite(min) ||
    typeof max !== "number" ||
    !Number.isFinite(max) ||
    min >= max
  ) {
    throw createBadRequestError("Expression domain definition is invalid.", {
      field: "definition",
    });
  }

  return { min, max };
};

export const assertNumericContinuousValueInRange = ({ value, definition }) => {
  if (value < definition.min || value > definition.max) {
    throw createBadRequestError(
      `Value must be between ${definition.min} and ${definition.max}.`,
      {
        field: "value",
      }
    );
  }
};
