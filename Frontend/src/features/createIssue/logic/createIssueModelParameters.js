import {
  buildCreateIssueParameterDefaults,
  updateCreateIssueParameterValues,
} from "../../modelParameters";

export const setDefaults = (allData) => {
  return buildCreateIssueParameterDefaults({
    selectedModel: allData?.selectedModel,
    leafCriteria: allData?.criteria || [],
  });
};

export const updateParamValues = (prev, selectedModel, criteria) => {
  return updateCreateIssueParameterValues({
    previous: prev,
    selectedModel,
    leafCriteria: criteria,
  });
};
