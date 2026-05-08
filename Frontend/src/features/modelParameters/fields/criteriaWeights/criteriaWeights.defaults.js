const getParameterExpectedLength = (parameter, leafCount) => {
  if (parameter?.scope === "perCriterion") return leafCount;
  const length = parameter?.restrictions?.length;
  return typeof length === "number" ? length : null;
};

export const buildEqualWeights = (length) => {
  const safeLength = Math.max(Number(length) || 0, 1);
  if (safeLength === 1) return [1];

  const precision = 6;
  const factor = 10 ** precision;
  const base = Math.floor((1 / safeLength) * factor) / factor;
  const values = Array(safeLength).fill(base);
  const partial = values.slice(0, -1).reduce((sum, item) => sum + item, 0);
  values[safeLength - 1] = +(1 - partial).toFixed(precision);

  return values;
};

export const buildCriteriaWeightsDefault = ({ parameter, leafCount }) => {
  if (parameter?.default !== "equal") return undefined;

  const restrictions = parameter?.restrictions || {};
  const length =
    getParameterExpectedLength(parameter, leafCount) ?? restrictions?.length ?? 2;

  return buildEqualWeights(length);
};

export const syncCriteriaWeightsValueWithExpectedLength = ({
  previousValue,
  parameter,
  leafCount,
}) => {
  const restrictions = parameter?.restrictions || {};
  const expectedLength =
    getParameterExpectedLength(parameter, leafCount) ?? restrictions?.length ?? 2;

  if (Array.isArray(previousValue) && previousValue.length === expectedLength) {
    return previousValue;
  }

  return buildEqualWeights(expectedLength);
};
