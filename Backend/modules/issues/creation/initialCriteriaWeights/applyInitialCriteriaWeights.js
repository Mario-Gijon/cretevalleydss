export const applyResolvedCriteriaWeightingToIssue = ({
  issue,
  resolvedCriteriaWeighting,
}) => {
  issue.criteriaWeightingStructureKey =
    resolvedCriteriaWeighting.criteriaWeightingStructureKey;
  issue.criteriaWeightingModel =
    resolvedCriteriaWeighting.criteriaWeightingModel
      ? resolvedCriteriaWeighting.criteriaWeightingModel._id
      : null;
  issue.criteriaWeightingApiModelKey =
    resolvedCriteriaWeighting.criteriaWeightingApiModelKey;
  issue.criteriaWeightingApiEndpoint =
    resolvedCriteriaWeighting.criteriaWeightingApiEndpoint;
  issue.criteriaWeightingParameters =
    resolvedCriteriaWeighting.criteriaWeightingParameters;
  issue.currentStage = resolvedCriteriaWeighting.currentStage;

  if (resolvedCriteriaWeighting.modelWeights !== null) {
    issue.modelParameters = {
      ...issue.modelParameters,
      weights: resolvedCriteriaWeighting.modelWeights,
    };
  }
};
