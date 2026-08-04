export const PAIRWISE_MAX_DECIMAL_PLACES = 3;

const DECIMAL_PATTERN = /(?:\.(\d*))?(?:e([+-]?\d+))?$/i;

export const countDecimalPlaces = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return Number.POSITIVE_INFINITY;
  }

  const match = String(value).match(DECIMAL_PATTERN);
  const fractionalLength = match?.[1]?.length ?? 0;
  const exponent = Number(match?.[2] ?? 0);

  return Math.max(0, fractionalLength - exponent);
};

export const hasAtMostDecimalPlaces = ({ value, maxDecimalPlaces }) =>
  countDecimalPlaces(value) <= maxDecimalPlaces;

export const roundToDecimalPlaces = ({ value, decimalPlaces }) => {
  const factor = 10 ** decimalPlaces;

  return Math.round((value + Number.EPSILON) * factor) / factor;
};
