export const buildActiveWorkflowSteps = ({ hasAlternativeConsensus }) => {
  const steps = [
    { key: "criteriaWeighting", label: "Criteria weighting" },
    { key: "weightsFinished", label: "Weights finished" },
    { key: "alternativeEvaluation", label: "Alternative evaluation" },
  ];

  if (hasAlternativeConsensus) {
    steps.push({ key: "alternativeConsensus", label: "Alternative consensus" });
  }

  steps.push({ key: "readyResolve", label: "Ready to resolve" });

  return steps;
};
