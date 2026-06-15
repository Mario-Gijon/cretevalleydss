export const WEIGHT_SUM_TOLERANCE = 1e-6;

export const buildEqualCrispWeights = (leafCriteriaCount) => {
  if (!Number.isInteger(leafCriteriaCount) || leafCriteriaCount <= 0) {
    return [];
  }

  if (leafCriteriaCount === 1) {
    return [1];
  }

  const weight = 1 / leafCriteriaCount;
  return Array.from({ length: leafCriteriaCount }, () => weight);
};

export const buildEqualFuzzyWeights = (leafCriteriaCount) => {
  const middleValues = buildEqualCrispWeights(leafCriteriaCount);
  return middleValues.map((middle) => {
    const spread = Math.min(0.05, middle * 0.5);
    const lower = Math.max(0, middle - spread);
    const upper = Math.min(1, middle + spread);
    return [lower, middle, upper];
  });
};
