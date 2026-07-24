export const updateValue = ({
  evaluation,
  alternativeId,
  criterionId,
  nextValue,
}) => {
  const nextEvaluation = structuredClone(evaluation);
  nextEvaluation[alternativeId][criterionId] = nextValue;
  return nextEvaluation;
};
