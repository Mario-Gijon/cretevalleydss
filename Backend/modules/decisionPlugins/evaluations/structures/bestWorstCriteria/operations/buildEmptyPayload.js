const buildEmptyComparisons = (criteria) =>
  Object.fromEntries(criteria.map((criterion) => [criterion.id, ""]));

export const buildEmptyPayload = ({ criteria }) => {
  const bestToOthers = buildEmptyComparisons(criteria);
  const othersToWorst = buildEmptyComparisons(criteria);

  const emptyPayload = {
    bestCriterionId: "",
    worstCriterionId: "",
    bestToOthers,
    othersToWorst,
  };

  return emptyPayload;
};
