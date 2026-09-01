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

const normalizeParameterValue = (parameter, value) => {
  if (
    parameter?.parameterStructureKey !== "twoTupleAggregation" ||
    !isPlainObject(value)
  ) {
    return cloneValue(value);
  }

  const methodDefinition = Array.isArray(parameter?.restrictions?.methods)
    ? parameter.restrictions.methods.find((method) => method?.key === value.method)
    : null;

  if (
    !methodDefinition ||
    (Array.isArray(methodDefinition.subparameters) &&
      methodDefinition.subparameters.length > 0)
  ) {
    return cloneValue(value);
  }

  return {
    ...cloneValue(value),
    options: isPlainObject(value.options) ? cloneValue(value.options) : {},
  };
};

export const getCreateIssueModelParameters = (selectedModel) =>
  readModelParameters(selectedModel).filter((parameter) => parameter?.key && !isCriteriaWeightLikeParameter(parameter));

export const buildCreateIssueParameterDefaults = ({ selectedModel }) =>
  getCreateIssueModelParameters(selectedModel).reduce((result, parameter) => {
    if (hasOwnKey(parameter, "default")) {
      result[parameter.key] = normalizeParameterValue(parameter, parameter.default);
    }
    return result;
  }, {});

export const updateCreateIssueParameterValues = ({ previous, selectedModel }) => {
  const source = isPlainObject(previous) ? previous : {};
  return getCreateIssueModelParameters(selectedModel).reduce((result, parameter) => {
    if (hasOwnKey(source, parameter.key)) {
      result[parameter.key] = normalizeParameterValue(parameter, source[parameter.key]);
    } else if (hasOwnKey(parameter, "default")) {
      result[parameter.key] = normalizeParameterValue(parameter, parameter.default);
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
        return [key, normalizeParameterValue(parameter, value)];
      })
  );
};
