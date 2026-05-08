const getParameterExpectedLength = (parameter, leafCount) => {
  if (parameter?.scope === "perCriterion") return leafCount;
  const length = parameter?.restrictions?.length;
  return typeof length === "number" ? length : null;
};

const buildEqualMiddleWeights = (length) => {
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

export const buildEqualFuzzyCriteriaWeights = (length) => {
  const middles = buildEqualMiddleWeights(length);
  const precision = 6;

  return middles.map((middle) => {
    const delta = Math.min(0.05, middle * 0.25);
    const l = +Math.max(0, middle - delta).toFixed(precision);
    const m = +middle.toFixed(precision);
    const u = +Math.min(1, middle + delta).toFixed(precision);
    return [l, m, u];
  });
};

export const buildFuzzyCriteriaWeightsDefault = ({ parameter, leafCount }) => {
  if (parameter?.default !== "equal") return undefined;

  const restrictions = parameter?.restrictions || {};
  const length =
    getParameterExpectedLength(parameter, leafCount) ?? restrictions?.length ?? 1;

  return buildEqualFuzzyCriteriaWeights(length);
};

export const syncFuzzyCriteriaWeightsValueWithExpectedLength = ({
  previousValue,
  parameter,
  leafCount,
}) => {
  const restrictions = parameter?.restrictions || {};
  const expectedLength =
    getParameterExpectedLength(parameter, leafCount) ?? restrictions?.length ?? 1;

  const isValid =
    Array.isArray(previousValue) &&
    previousValue.length === expectedLength &&
    previousValue.every(
      (triangle) =>
        Array.isArray(triangle) &&
        triangle.length === 3
    );

  if (isValid) return previousValue;
  return buildEqualFuzzyCriteriaWeights(expectedLength);
};
