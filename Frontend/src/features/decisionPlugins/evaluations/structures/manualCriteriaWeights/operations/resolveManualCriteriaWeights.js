const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const resolveManualCriteriaWeights = (evaluation) =>
  isPlainObject(evaluation) ? evaluation.weightsByCriterion || {} : {};

export const resolveCollectiveManualCriteriaWeights = (collectiveEvaluation) =>
  isPlainObject(collectiveEvaluation) &&
  isPlainObject(collectiveEvaluation.weightsByCriterion)
    ? collectiveEvaluation.weightsByCriterion
    : {};
