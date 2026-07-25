export const buildEmptyComparisons = (criteria) =>
  Object.fromEntries(criteria.map((criterion) => [criterion.id, ""]));

export const buildEmptyPayload = ({ criteria }) => {
  const emptyPayload = {
    bestCriterionId: "",
    worstCriterionId: "",
    bestToOthers: buildEmptyComparisons(criteria),
    othersToWorst: buildEmptyComparisons(criteria),
  };

  return emptyPayload;
};
