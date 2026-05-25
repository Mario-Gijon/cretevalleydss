import { getCreateIssueModelParameters } from "./modelParameter.filters";
import { buildInitialParameterValues, pruneParameterValues } from "./parameterValues";

export const buildCreateIssueParameterDefaults = ({ selectedModel }) => {
  const parameters = getCreateIssueModelParameters(selectedModel);
  return buildInitialParameterValues(parameters);
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
  return pruneParameterValues(parameters, values);
};
