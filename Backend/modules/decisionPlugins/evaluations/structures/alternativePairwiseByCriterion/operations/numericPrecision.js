export const PAIRWISE_MAX_DECIMAL_PLACES = 3;

const DECIMAL_PATTERN = /(?:\.(\d*))?(?:e([+-]?\d+))?$/i;

const countDecimalPlaces = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return Number.POSITIVE_INFINITY;
  }

  const match = String(value).match(DECIMAL_PATTERN);
  const fractionalLength = match?.[1]?.length ?? 0;
  const exponent = Number(match?.[2] ?? 0);

  return Math.max(0, fractionalLength - exponent);
};

export const hasAtMostPairwiseDecimalPlaces = (value) =>
  countDecimalPlaces(value) <= PAIRWISE_MAX_DECIMAL_PLACES;

export const roundPairwiseNumericValue = (value) => {
  const factor = 10 ** PAIRWISE_MAX_DECIMAL_PLACES;

  return Math.round((value + Number.EPSILON) * factor) / factor;
};
