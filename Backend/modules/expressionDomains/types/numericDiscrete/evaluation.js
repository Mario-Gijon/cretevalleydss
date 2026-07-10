import { createBadRequestError } from "../../../../utils/common/errors.js";
import {
  getExpressionDomainDefinitionOrThrow,
  normalizeFiniteNumberOrThrow,
} from "../../shared/validation.js";

const EPSILON = 1e-9;

export const normalizeNumericDiscreteEvaluationValue = (value) =>
  normalizeFiniteNumberOrThrow(value, {
    message: "Value must be a finite number.",
    field: "value",
  });

export const getNumericDiscreteEvaluationDefinition = (expressionDomain) => {
  const definition = getExpressionDomainDefinitionOrThrow(expressionDomain);
  const min = definition?.min;
  const max = definition?.max;
  const step = definition?.step;

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

  if (typeof step !== "number" || !Number.isFinite(step)) {
    throw createBadRequestError("Expression domain definition is invalid.", {
      field: "definition",
    });
  }

  if (step <= 0) {
    throw createBadRequestError("Expression domain step must be greater than 0.", {
      field: "definition",
    });
  }

  return { min, max, step };
};

export const assertNumericDiscreteValueInRange = ({ value, definition }) => {
  if (value < definition.min || value > definition.max) {
    throw createBadRequestError(
      `Value must be between ${definition.min} and ${definition.max}.`,
      {
        field: "value",
      }
    );
  }
};

export const assertNumericDiscreteValueStepAligned = ({ value, definition }) => {
  const offset = (value - definition.min) / definition.step;
  const nearest = Math.round(offset);

  if (Math.abs(offset - nearest) > EPSILON) {
    throw createBadRequestError("Value must align with the configured discrete step.", {
      field: "value",
    });
  }
};
