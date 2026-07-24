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
