const readModelParameters = (selectedModel) =>
  Array.isArray(selectedModel?.parameters) ? selectedModel.parameters : [];

export const isCriteriaWeightLikeParameter = (parameter) =>
  ["criteriaWeights", "fuzzyCriteriaWeights"].includes(parameter?.parameterStructureKey) ||
  parameter?.semanticRole === "criteriaWeights";

export const getCreateIssueModelParameters = (selectedModel) =>
  readModelParameters(selectedModel).filter(
    (parameter) => Boolean(parameter?.key) && !isCriteriaWeightLikeParameter(parameter)
  );

export const buildCreateIssueParameterDefaults = ({ selectedModel }) => {
  const parameters = getCreateIssueModelParameters(selectedModel);

  return parameters.reduce((accumulator, parameter) => {
    const key = parameter?.key;
    if (!key) return accumulator;

    accumulator[key] = parameter?.default ?? "";
    return accumulator;
  }, {});
};

export const updateCreateIssueParameterValues = ({ previous, selectedModel }) => {
  const parameters = getCreateIssueModelParameters(selectedModel);
  const next = { ...(previous || {}) };

  parameters.forEach((parameter) => {
    const key = parameter?.key;
    if (!key) return;

    if (next[key] === undefined) {
      next[key] = parameter?.default ?? "";
    }
  });

  return next;
};

export const pruneCreateIssueParameterValues = ({ selectedModel, values }) => {
  const parameters = getCreateIssueModelParameters(selectedModel);
  const allowedKeys = new Set(parameters.map((parameter) => parameter?.key).filter(Boolean));
  const source = values && typeof values === "object" && !Array.isArray(values) ? values : {};

  return Object.entries(source).reduce((accumulator, [key, value]) => {
    if (allowedKeys.has(key)) {
      accumulator[key] = value;
    }

    return accumulator;
  }, {});
};
