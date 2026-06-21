const isValidBwmScaleValue = (value) =>
  Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 9;

export const getBestWorstCriterionItems = (evaluationContext) =>
  Array.isArray(evaluationContext?.leafCriteria)
    ? evaluationContext.leafCriteria
        .map((criterion) => ({
          id: String(criterion?.id ?? criterion?._id ?? "").trim(),
          name: String(criterion?.name ?? "").trim(),
        }))
        .filter((criterion) => criterion.id && criterion.name)
    : [];

export const buildEmptyBestWorstCriteriaPayload = (criterionItems) => ({
  bestCriterion: criterionItems[0]?.id || "",
  worstCriterion:
    criterionItems.length > 1
      ? criterionItems[criterionItems.length - 1]?.id || ""
      : criterionItems[0]?.id || "",
  bestToOthers: Object.fromEntries(
    criterionItems.map((criterion) => [
      criterion.id,
      criterion.id === criterionItems[0]?.id ? 1 : "",
    ])
  ),
  othersToWorst: Object.fromEntries(
    criterionItems.map((criterion) => [
      criterion.id,
      criterion.id ===
      (criterionItems.length > 1
        ? criterionItems[criterionItems.length - 1]?.id
        : criterionItems[0]?.id)
        ? 1
        : "",
    ])
  ),
});

export const validateBestWorstCriteriaPayload = ({ criterionItems, payload }) => {
  const criterionIds = criterionItems.map((criterion) => criterion.id);
  const { bestCriterion, worstCriterion, bestToOthers, othersToWorst } = payload;

  if (!bestCriterion) return "Best criterion is required.";
  if (!worstCriterion) return "Worst criterion is required.";
  if (!criterionIds.includes(bestCriterion)) return "Best criterion is invalid.";
  if (!criterionIds.includes(worstCriterion)) return "Worst criterion is invalid.";
  if (criterionIds.length > 1 && bestCriterion === worstCriterion) {
    return "Best and worst criteria must be different.";
  }

  for (const criterion of criterionItems) {
    if (
      criterion.id !== bestCriterion &&
      !isValidBwmScaleValue(bestToOthers[criterion.id])
    ) {
      return `Best-to-others value for '${criterion.name}' must be an integer between 1 and 9.`;
    }

    if (
      criterion.id !== worstCriterion &&
      !isValidBwmScaleValue(othersToWorst[criterion.id])
    ) {
      return `Others-to-worst value for '${criterion.name}' must be an integer between 1 and 9.`;
    }
  }

  if (bestToOthers[bestCriterion] !== 1) {
    return "Best criterion self-comparison must be 1.";
  }

  if (othersToWorst[worstCriterion] !== 1) {
    return "Worst criterion self-comparison must be 1.";
  }

  return null;
};
