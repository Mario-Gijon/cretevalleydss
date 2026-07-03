import { createBadRequestError } from "../../../../../utils/common/errors.js";

const EPSILON = 1e-9;

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim() !== "";

const normalizeNameOrThrow = (value) => {
  if (!isNonEmptyString(value)) {
    throw createBadRequestError("Expression domain name is required.", {
      field: "name",
    });
  }

  return value.trim();
};

const normalizeFiniteNumberOrThrow = (value, field) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw createBadRequestError(`${field} must be a finite number.`, {
      field,
    });
  }

  return value;
};

const validateRangeOrThrow = (min, max, fieldPrefix) => {
  if (min >= max) {
    throw createBadRequestError(`${fieldPrefix}.min must be less than ${fieldPrefix}.max.`, {
      field: fieldPrefix,
    });
  }
};

const getDefinitionOrThrow = (expressionDomain, field) => {
  const definition = expressionDomain?.definition;

  if (definition === null || typeof definition !== "object" || Array.isArray(definition)) {
    throw createBadRequestError("expressionDomain.definition is required.", {
      field,
    });
  }

  return definition;
};

const ensureStepAlignmentOrThrow = ({ value, min, step, field }) => {
  const offset = (value - min) / step;
  const nearest = Math.round(offset);

  if (Math.abs(offset - nearest) > EPSILON) {
    throw createBadRequestError(
      `${field} must align with the configured discrete step.`,
      { field }
    );
  }
};

export const numericDiscrete = Object.freeze({
  key: "numericDiscrete",
  label: "Numeric Discrete",
  description: "Discrete numeric domain constrained by minimum, maximum, and step.",
  family: "numeric",

  validateCreation(payload = {}) {
    const name = normalizeNameOrThrow(payload?.name);
    const definition = payload?.definition;

    if (definition === null || typeof definition !== "object" || Array.isArray(definition)) {
      throw createBadRequestError("definition must be an object.", {
        field: "definition",
      });
    }

    const min = normalizeFiniteNumberOrThrow(definition.min, "definition.min");
    const max = normalizeFiniteNumberOrThrow(definition.max, "definition.max");
    const step = normalizeFiniteNumberOrThrow(definition.step, "definition.step");
    validateRangeOrThrow(min, max, "definition");

    if (step <= 0) {
      throw createBadRequestError("definition.step must be greater than 0.", {
        field: "definition.step",
      });
    }

    return {
      name,
      typeKey: "numericDiscrete",
      family: "numeric",
      definition: {
        min,
        max,
        step,
      },
    };
  },

  validateEvaluation({ value, expressionDomain, field = "value" } = {}) {
    const normalizedValue = normalizeFiniteNumberOrThrow(value, field);
    const definition = getDefinitionOrThrow(expressionDomain, field);
    const min = normalizeFiniteNumberOrThrow(definition.min, `${field}.definition.min`);
    const max = normalizeFiniteNumberOrThrow(definition.max, `${field}.definition.max`);
    const step = normalizeFiniteNumberOrThrow(definition.step, `${field}.definition.step`);
    validateRangeOrThrow(min, max, `${field}.definition`);

    if (step <= 0) {
      throw createBadRequestError("expressionDomain.definition.step must be greater than 0.", {
        field,
      });
    }

    if (normalizedValue < min || normalizedValue > max) {
      throw createBadRequestError(
        `${field} must be between ${min} and ${max}.`,
        { field }
      );
    }

    ensureStepAlignmentOrThrow({
      value: normalizedValue,
      min,
      step,
      field,
    });

    return normalizedValue;
  },
});
