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

const normalizeFiniteNumberOrThrow = (value, field = "value") => {
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

const normalizeEvaluationNumberOrThrow = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw createBadRequestError("Value must be a finite number.", {
      field: "value",
    });
  }

  return value;
};

const getEvaluationDefinitionOrThrow = (expressionDomain) => {
  const definition = expressionDomain?.definition;

  if (definition === null || typeof definition !== "object" || Array.isArray(definition)) {
    throw createBadRequestError("Expression domain definition is invalid.", {
      field: "definition",
    });
  }

  return definition;
};

const getEvaluationRangeOrThrow = (definition) => {
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

  validateEvaluation({ value, expressionDomain } = {}) {
    const normalizedValue = normalizeEvaluationNumberOrThrow(value);
    const definition = getEvaluationDefinitionOrThrow(expressionDomain);
    const { min, max } = getEvaluationRangeOrThrow(definition);

    if (normalizedValue < min || normalizedValue > max) {
      throw createBadRequestError(`Value must be between ${min} and ${max}.`, {
        field: "value",
      });
    }

    return normalizedValue;
  },
});
