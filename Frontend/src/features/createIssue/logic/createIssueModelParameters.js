import {
  buildCreateIssueParameterDefaults,
  updateCreateIssueParameterValues,
} from "../../modelParameters/draft";

export const setDefaults = (allData) => {
  return buildCreateIssueParameterDefaults({
    selectedModel: allData?.selectedModel,
  });
};

export const updateParamValues = (prev, selectedModel, criteria) => {
  return updateCreateIssueParameterValues({
    previous: prev,
    selectedModel,
  });
};
