const getParameterExpectedLength = (parameter, leafCount) => {
  if (parameter?.scope === "perCriterion") return leafCount;
  const length = parameter?.restrictions?.length;
  return typeof length === "number" ? length : null;
};

export const CRITERIA_WEIGHTS_SUM_TOLERANCE = 1e-6;

export const validateCriteriaWeightsValue = ({
  value,
  expectedLength,
  min = 0,
  max = 1,
  targetSum = 1,
  tolerance = CRITERIA_WEIGHTS_SUM_TOLERANCE,
}) => {
  if (!Array.isArray(value)) {
    return { isValid: false, message: "Weights must be an array." };
  }

  if (Number.isInteger(expectedLength) && expectedLength >= 0 && value.length !== expectedLength) {
    return {
      isValid: false,
      message: `Weights must contain exactly ${expectedLength} values.`,
    };
  }

  const numericValues = value.map((item) =>
    typeof item === "number" ? item : Number(item)
  );

  if (numericValues.some((item) => !Number.isFinite(item))) {
    return { isValid: false, message: "All weights must be valid numbers." };
  }

  if (numericValues.some((item) => item < min || item > max)) {
    return {
      isValid: false,
      message: `Each weight must be between ${min} and ${max}.`,
    };
  }

  const total = numericValues.reduce((sum, item) => sum + item, 0);
  if (Math.abs(total - targetSum) > tolerance) {
    return {
      isValid: false,
      message: `Weights must sum to ${1}`,
    };
  }

  return { isValid: true, values: numericValues };
};

export const validateCriteriaWeightsParameterValue = ({
  parameter,
  value,
  leafCount,
  tolerance = CRITERIA_WEIGHTS_SUM_TOLERANCE,
}) => {
  const restrictions = parameter?.restrictions || {};
  const expectedLength =
    getParameterExpectedLength(parameter, leafCount) ?? null;

  return validateCriteriaWeightsValue({
    value,
    expectedLength,
    min: typeof restrictions.min === "number" ? restrictions.min : 0,
    max: typeof restrictions.max === "number" ? restrictions.max : 1,
    targetSum: typeof restrictions.sum === "number" ? restrictions.sum : 1,
    tolerance,
  });
};
