export const resolveManualCriteriaWeightItems = (decisionContext) =>
  Array.isArray(decisionContext?.leafCriteria)
    ? decisionContext.leafCriteria
        .map((criterion) => ({
          id: criterion?.id,
          name: criterion?.name,
        }))
        .filter((criterion) => criterion.id && criterion.name)
    : [];
