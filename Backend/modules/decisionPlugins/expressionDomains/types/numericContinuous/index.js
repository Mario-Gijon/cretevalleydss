import { createBadRequestError } from "../../../../../utils/common/errors.js";

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

export const numericContinuous = Object.freeze({
  key: "numericContinuous",
  label: "Numeric Continuous",
  description: "Continuous numeric domain with a minimum and maximum value.",
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
    validateRangeOrThrow(min, max, "definition");

    return {
      name,
      typeKey: "numericContinuous",
      family: "numeric",
      definition: {
        min,
        max,
        step: null,
      },
    };
  },

  validateEvaluation({ value, expressionDomain, field = "value" } = {}) {
    const normalizedValue = normalizeFiniteNumberOrThrow(value, field);
    const definition = getDefinitionOrThrow(expressionDomain, field);
    const min = normalizeFiniteNumberOrThrow(definition.min, `${field}.definition.min`);
    const max = normalizeFiniteNumberOrThrow(definition.max, `${field}.definition.max`);
    validateRangeOrThrow(min, max, `${field}.definition`);

    if (normalizedValue < min || normalizedValue > max) {
      throw createBadRequestError(
        `${field} must be between ${min} and ${max}.`,
        { field }
      );
    }

    return normalizedValue;
  },
});
