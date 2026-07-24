export const getBestWorstCriterionItems = (decisionContext) =>
  Array.isArray(decisionContext?.leafCriteria)
    ? decisionContext.leafCriteria
        .map((criterion) => ({
          id: String(criterion?.id ?? criterion?._id ?? "").trim(),
          name: String(criterion?.name ?? "").trim(),
        }))
        .filter((criterion) => criterion.id && criterion.name)
    : [];
