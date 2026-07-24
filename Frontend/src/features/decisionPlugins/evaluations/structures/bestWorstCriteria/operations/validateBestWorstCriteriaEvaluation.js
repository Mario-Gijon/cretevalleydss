const isValidBestWorstScaleValue = (value) =>
  Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 9;

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
      !isValidBestWorstScaleValue(bestToOthers[criterion.id])
    ) {
      return `Best-to-others value for '${criterion.name}' must be an integer between 1 and 9.`;
    }

    if (
      criterion.id !== worstCriterion &&
      !isValidBestWorstScaleValue(othersToWorst[criterion.id])
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
