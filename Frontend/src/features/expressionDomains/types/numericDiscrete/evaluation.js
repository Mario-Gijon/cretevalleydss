export const NUMERIC_DISCRETE_EPSILON = 1e-9;

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

const isStepAligned = ({ value, min = 0, step }) => {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) {
    return true;
  }

  const ratio = (value - min) / step;
  return Math.abs(ratio - Math.round(ratio)) < NUMERIC_DISCRETE_EPSILON;
};

export const getNumericDiscreteEvaluationDefinition = (expressionDomain) => {
  const definition = normalizeNumericDefinition(expressionDomain);

  if (!definition) {
    throw new Error("Expression domain definition is invalid.");
  }

  const min = Number.isFinite(definition.min) ? definition.min : null;
  const max = Number.isFinite(definition.max) ? definition.max : null;
  const step = Number.isFinite(definition.step) ? definition.step : null;

  if (
    (Number.isFinite(min) && Number.isFinite(max) && min > max) ||
    (step !== null && step <= 0)
  ) {
    throw new Error("Expression domain definition is invalid.");
  }

  return { min, max, step };
};

export const validateNumericDiscreteEvaluation = ({
  value,
  expressionDomain,
} = {}) => {
  const normalizedValue = normalizeFiniteNumberOrThrow(value);
  const definition = getNumericDiscreteEvaluationDefinition(expressionDomain);

  if (
    (Number.isFinite(definition.min) && normalizedValue < definition.min) ||
    (Number.isFinite(definition.max) && normalizedValue > definition.max)
  ) {
    throw new Error(buildRangeMessage(definition));
  }

  if (
    Number.isFinite(definition.step) &&
    !isStepAligned({
      value: normalizedValue,
      min: definition.min ?? 0,
      step: definition.step,
    })
  ) {
    throw new Error(`Value must follow step ${definition.step}.`);
  }

  return normalizedValue;
};

export const assertNumericDiscreteValueStepAligned = ({ value, definition }) => {
  if (
    !isStepAligned({
      value,
      min: definition?.min ?? 0,
      step: definition?.step,
    })
  ) {
    throw new Error(`Value must follow step ${definition.step}.`);
  }
};
