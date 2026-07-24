const normalizeDecisionItem = (item) => ({
  ...item,
  id: String(item?.id ?? item?._id ?? "").trim(),
  name: String(item?.name ?? "").trim(),
});

export const resolveAlternativePairwiseContext = (decisionContext) => ({
  alternatives: Array.isArray(decisionContext?.alternatives)
    ? decisionContext.alternatives
        .map(normalizeDecisionItem)
        .filter((alternative) => alternative.id && alternative.name)
    : [],
  criteria: Array.isArray(decisionContext?.leafCriteria)
    ? decisionContext.leafCriteria
        .map(normalizeDecisionItem)
        .filter((criterion) => criterion.id && criterion.name)
    : [],
});
