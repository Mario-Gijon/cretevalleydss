const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeNumericDefinition = (expressionDomain) =>
  isPlainObject(expressionDomain?.definition) ? expressionDomain.definition : null;

const normalizeFiniteNumberOrThrow = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed !== "") {
      const parsed = Number(trimmed);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  throw new Error("Enter a valid number.");
};

const buildRangeMessage = ({ min, max }) => {
  if (Number.isFinite(min) && Number.isFinite(max)) {
    return `Value must be between ${min} and ${max}.`;
  }

  if (Number.isFinite(min)) {
    return `Value must be at least ${min}.`;
  }

  if (Number.isFinite(max)) {
    return `Value must be at most ${max}.`;
  }

  return "";
};

export const getNumericContinuousEvaluationDefinition = (expressionDomain) => {
  const definition = normalizeNumericDefinition(expressionDomain);

  if (!definition) {
    throw new Error("Expression domain definition is invalid.");
  }

  const min = definition.min;
  const max = definition.max;

  if (
    typeof min !== "number" ||
    !Number.isFinite(min) ||
    typeof max !== "number" ||
    !Number.isFinite(max) ||
    min >= max
  ) {
    throw new Error("Expression domain definition is invalid.");
  }

  return { min, max };
};

export const validateNumericContinuousEvaluation = ({
  value,
  expressionDomain,
} = {}) => {
  const normalizedValue = normalizeFiniteNumberOrThrow(value);
  const definition = getNumericContinuousEvaluationDefinition(expressionDomain);

  if (
    (Number.isFinite(definition.min) && normalizedValue < definition.min) ||
    (Number.isFinite(definition.max) && normalizedValue > definition.max)
  ) {
    throw new Error(buildRangeMessage(definition));
  }

  return normalizedValue;
};
