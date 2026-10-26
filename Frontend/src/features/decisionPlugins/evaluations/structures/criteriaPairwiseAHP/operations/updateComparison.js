export const updateComparison = ({
  evaluation,
  criterionId,
  comparedCriterionId,
  value,
}) => {
  const current = Array.isArray(evaluation?.comparisons)
    ? evaluation.comparisons
    : [];
  const pair = new Set([criterionId, comparedCriterionId]);
  const existingIndex = current.findIndex(
    (item) =>
      item?.criterionId !== item?.comparedCriterionId &&
      pair.has(item?.criterionId) &&
      pair.has(item?.comparedCriterionId)
  );
  const comparisons = [...current];
  if (value === null || value === undefined || value === "") {
    if (existingIndex < 0) return evaluation;
    comparisons.splice(existingIndex, 1);
  } else {
    const normalizedValue = Number(value);
    if (!Number.isFinite(normalizedValue)) return evaluation;
    const judgment = { criterionId, comparedCriterionId, value: normalizedValue };
    if (existingIndex < 0) comparisons.push(judgment);
    else comparisons[existingIndex] = judgment;
  }
  return { comparisons };
};

export const getOrientedComparisonValue = ({
  comparisons,
  criterionId,
  comparedCriterionId,
}) => {
  const comparison = (Array.isArray(comparisons) ? comparisons : []).find(
    (item) =>
      item?.criterionId !== item?.comparedCriterionId &&
      ((item?.criterionId === criterionId &&
        item?.comparedCriterionId === comparedCriterionId) ||
        (item?.criterionId === comparedCriterionId &&
          item?.comparedCriterionId === criterionId))
  );
  if (!comparison) return "";
  return comparison.criterionId === criterionId
    ? comparison.value
    : 1 / comparison.value;
};
