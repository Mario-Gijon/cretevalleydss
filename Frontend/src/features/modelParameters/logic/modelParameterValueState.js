import { isPlainObject } from "../../../utils/common/objects";

const hasOwnKey = (value, key) =>
  value !== null && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, key);

const cloneValue = (value) => {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (isPlainObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
  return value;
};

export const isCriteriaWeightLikeParameter = (parameter) => parameter?.semanticRole === "criteriaWeights";

const readModelParameters = (selectedModel) =>
  Array.isArray(selectedModel?.parameters) ? selectedModel.parameters : [];

export const getCreateIssueModelParameters = (selectedModel) =>
  readModelParameters(selectedModel).filter((parameter) => parameter?.key && !isCriteriaWeightLikeParameter(parameter));

export const buildCreateIssueParameterDefaults = ({ selectedModel }) =>
  getCreateIssueModelParameters(selectedModel).reduce((result, parameter) => {
    if (hasOwnKey(parameter, "default")) result[parameter.key] = cloneValue(parameter.default);
    return result;
  }, {});

export const updateCreateIssueParameterValues = ({ previous, selectedModel }) => {
  const source = isPlainObject(previous) ? previous : {};
  return getCreateIssueModelParameters(selectedModel).reduce((result, parameter) => {
    if (hasOwnKey(source, parameter.key)) result[parameter.key] = cloneValue(source[parameter.key]);
    else if (hasOwnKey(parameter, "default")) result[parameter.key] = cloneValue(parameter.default);
    return result;
  }, {});
};

export const pruneCreateIssueParameterValues = ({ selectedModel, values }) => {
  const allowedKeys = new Set(getCreateIssueModelParameters(selectedModel).map((parameter) => parameter.key));
  const source = isPlainObject(values) ? values : {};
  return Object.fromEntries(Object.entries(source).filter(([key]) => allowedKeys.has(key)));
};
