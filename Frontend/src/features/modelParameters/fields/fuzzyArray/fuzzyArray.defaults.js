const getParameterExpectedLength = (parameter, leafCount) => {
  if (parameter?.scope === "perCriterion") return leafCount;
  const length = parameter?.restrictions?.length;
  return typeof length === "number" ? length : null;
};

export const buildFuzzyArrayDefault = ({ parameter, leafCount }) => {
  const restrictions = parameter?.restrictions || {};
  const defaultValue = parameter?.default;
  const length =
    getParameterExpectedLength(parameter, leafCount) ?? restrictions?.length ?? 1;

  return Array.isArray(defaultValue)
    ? defaultValue
    : Array(length).fill([0, 0, 0]);
};

export const updateFuzzyArrayValue = ({ previousValue, parameter, leafCount }) => {
  const expectedLength = getParameterExpectedLength(parameter, leafCount);
  if (expectedLength === null) return previousValue;

  const isInvalid =
    !Array.isArray(previousValue) ||
    previousValue.length !== expectedLength ||
    previousValue.some((triangle) => !Array.isArray(triangle) || triangle.length !== 3);

  if (!isInvalid) return previousValue;

  const defaultValue = parameter?.default;
  return Array.isArray(defaultValue)
    ? defaultValue.slice(0, expectedLength)
    : Array(expectedLength).fill([0, 0, 0]);
};
