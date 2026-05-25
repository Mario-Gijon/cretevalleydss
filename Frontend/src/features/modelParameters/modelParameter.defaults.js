import { getCreateIssueModelParameters } from "./modelParameter.filters";
import { buildInitialParameterValues, normalizeParameterValues } from "./parameterValues";
import { resolveParameterStructure } from "./parameter.registry";
import { buildEqualWeights } from "./fields/criteriaWeights/criteriaWeights.defaults";

export { buildEqualWeights };

export const buildCreateIssueParameterDefaults = ({ selectedModel, leafCriteria }) => {
  const parameters = getCreateIssueModelParameters(selectedModel);
  const context = {
    leafCriteria: Array.isArray(leafCriteria) ? leafCriteria : [],
  };

  return buildInitialParameterValues(parameters, context);
};

export const updateCreateIssueParameterValues = ({ previous, selectedModel, leafCriteria }) => {
  const parameters = getCreateIssueModelParameters(selectedModel);
  const context = {
    leafCriteria: Array.isArray(leafCriteria) ? leafCriteria : [],
  };

  const next = { ...(previous || {}) };

  parameters.forEach((parameter) => {
    const parameterKey = parameter?.key;
    if (!parameterKey) return;

    const structure = resolveParameterStructure(parameter);
    const currentValue = next[parameterKey];
    if (currentValue === undefined) {
      next[parameterKey] = structure.getInitialValue(parameter, context);
    }
  });

  return next;
};

export const normalizeCreateIssueParameterValues = ({ selectedModel, values, leafCriteria }) => {
  const parameters = getCreateIssueModelParameters(selectedModel);

  return normalizeParameterValues(parameters, values, {
    leafCriteria: Array.isArray(leafCriteria) ? leafCriteria : [],
  });
};
