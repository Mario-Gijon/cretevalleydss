export const normalizeManualCriterionWeightInput = (rawValue) =>
  rawValue === "" ? "" : Number(rawValue);

export const updateManualCriterionWeight = ({
  evaluation,
  criterionId,
  rawValue,
}) => {
  const nextEvaluation = structuredClone(evaluation ?? {});
  nextEvaluation.weightsByCriterion = {
    ...(nextEvaluation.weightsByCriterion || {}),
    [criterionId]: normalizeManualCriterionWeightInput(rawValue),
  };
  return nextEvaluation;
};
