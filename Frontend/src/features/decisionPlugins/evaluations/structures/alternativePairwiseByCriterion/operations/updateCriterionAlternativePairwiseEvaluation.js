export const updateCriterionAlternativePairwiseEvaluation = ({
  evaluation,
  criterionId,
  nextComparisons,
}) => {
  if (
    evaluation === null ||
    typeof evaluation !== "object" ||
    Array.isArray(evaluation)
  ) {
    throw new Error("Pairwise evaluation payload state is invalid.");
  }

  const nextEvaluation = structuredClone(evaluation);
  nextEvaluation[criterionId] = nextComparisons;
  return nextEvaluation;
};
