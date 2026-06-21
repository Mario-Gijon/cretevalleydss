export const WEIGHT_SUM_TOLERANCE = 1e-6;

export const buildEqualCrispWeights = (criterionCount) => {
  if (!Number.isInteger(criterionCount) || criterionCount <= 0) {
    return [];
  }

  if (criterionCount === 1) {
    return [1];
  }

  const weight = 1 / criterionCount;
  return Array.from({ length: criterionCount }, () => weight);
};

export const buildEqualFuzzyWeights = (criterionCount) => {
  const middleValues = buildEqualCrispWeights(criterionCount);
  return middleValues.map((middle) => {
    const spread = Math.min(0.05, middle * 0.5);
    const lower = Math.max(0, middle - spread);
    const upper = Math.min(1, middle + spread);
    return [lower, middle, upper];
  });
};
