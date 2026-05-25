export const isCriteriaWeightLikeParameter = (parameter) =>
  ["criteriaWeights", "fuzzyCriteriaWeights"].includes(parameter?.parameterStructureKey) ||
  parameter?.semanticRole === "criteriaWeights";

export const getCreateIssueModelParameters = (selectedModel) => {
  const parameters = Array.isArray(selectedModel?.parameters) ? selectedModel.parameters : [];

  return parameters.filter(
    (parameter) => Boolean(parameter?.key) && !isCriteriaWeightLikeParameter(parameter)
  );
};
