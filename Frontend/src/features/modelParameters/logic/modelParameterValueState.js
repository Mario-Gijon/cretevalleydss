import { normalizeParameterValue } from "../../decisionPlugins/modelParameters";
import { isPlainObject } from "../../../utils/common/objects";

const hasOwnKey = (value, key) =>
  value !== null && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, key);

export const isCriteriaWeightLikeParameter = (parameter) => parameter?.semanticRole === "criteriaWeights";

const readModelParameters = (selectedModel) =>
  Array.isArray(selectedModel?.parameters) ? selectedModel.parameters : [];

export const normalizeModelParameterValue = (parameter, value) =>
  normalizeParameterValue(parameter, value);

export const getCreateIssueModelParameters = (selectedModel) =>
  readModelParameters(selectedModel).filter((parameter) => parameter?.key && !isCriteriaWeightLikeParameter(parameter));

export const buildCreateIssueParameterDefaults = ({ selectedModel }) =>
  getCreateIssueModelParameters(selectedModel).reduce((result, parameter) => {
    if (hasOwnKey(parameter, "default")) {
      result[parameter.key] = normalizeModelParameterValue(parameter, parameter.default);
    }
    return result;
  }, {});

export const updateCreateIssueParameterValues = ({ previous, selectedModel }) => {
  const source = isPlainObject(previous) ? previous : {};
  return getCreateIssueModelParameters(selectedModel).reduce((result, parameter) => {
    if (hasOwnKey(source, parameter.key)) {
      result[parameter.key] = normalizeModelParameterValue(parameter, source[parameter.key]);
    } else if (hasOwnKey(parameter, "default")) {
      result[parameter.key] = normalizeModelParameterValue(parameter, parameter.default);
    }
    return result;
  }, {});
};

export const pruneCreateIssueParameterValues = ({ selectedModel, values }) => {
  const parameters = getCreateIssueModelParameters(selectedModel);
  const allowedKeys = new Set(parameters.map((parameter) => parameter.key));
  const source = isPlainObject(values) ? values : {};
  return Object.fromEntries(
    Object.entries(source)
      .filter(([key]) => allowedKeys.has(key))
      .map(([key, value]) => {
        const parameter = parameters.find((candidate) => candidate.key === key);
        return [key, normalizeModelParameterValue(parameter, value)];
      })
  );
};
