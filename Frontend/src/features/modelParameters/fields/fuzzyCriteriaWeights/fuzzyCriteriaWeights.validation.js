const getParameterExpectedLength = (parameter, leafCount) => {
  if (parameter?.scope === "perCriterion") return leafCount;
  const length = parameter?.restrictions?.length;
  return typeof length === "number" ? length : null;
};

export const FUZZY_CRITERIA_WEIGHTS_SUM_TOLERANCE = 1e-6;

export const validateFuzzyCriteriaWeightsParameterValue = ({
  parameter,
  value,
  leafCount,
  tolerance = FUZZY_CRITERIA_WEIGHTS_SUM_TOLERANCE,
}) => {
  const expectedLength = getParameterExpectedLength(parameter, leafCount) ?? null;

  if (!Array.isArray(value)) {
    return { isValid: false, message: "Weights must be an array." };
  }

  if (Number.isInteger(expectedLength) && expectedLength >= 0 && value.length !== expectedLength) {
    return {
      isValid: false,
      message: `Weights must contain exactly ${expectedLength} values.`,
    };
  }

  const middles = [];

  for (const triangle of value) {
    if (!Array.isArray(triangle) || triangle.length !== 3) {
      return { isValid: false, message: "Each fuzzy weight must be [l, m, u]." };
    }

    const l = Number(triangle[0]);
    const m = Number(triangle[1]);
    const u = Number(triangle[2]);

    if (![l, m, u].every(Number.isFinite)) {
      return { isValid: false, message: "All fuzzy weights must be valid numbers." };
    }

    if (l < 0 || u > 1 || l > m || m > u) {
      return { isValid: false, message: "Each fuzzy weight must satisfy 0 <= l <= m <= u <= 1." };
    }

    middles.push(m);
  }

  const middleSum = middles.reduce((sum, item) => sum + item, 0);
  if (Math.abs(middleSum - 1) > tolerance) {
    return { isValid: false, message: "Middle fuzzy weights must sum to 1." };
  }

  return { isValid: true };
};
