import { isPlainObject } from "./isPlainObject";
import {
  buildCriterionParameterRows,
  isCriteriaWeightLikeParameter,
  isExpertWeightsParameter,
  isCriterionMapParameter,
} from "./modelParameterCriteria";

const readModelParameters = (selectedModel) =>
  Array.isArray(selectedModel?.parameters) ? selectedModel.parameters : [];

const buildCriterionMapDefault = (parameter, leafCriteria) => {
  const rows = buildCriterionParameterRows({ leafCriteria });
  const defaultValue = parameter.default ?? "";

  return rows.reduce((accumulator, row) => {
    accumulator[row.key] = defaultValue;
    return accumulator;
  }, {});
};

export const getCreateIssueModelParameters = (selectedModel) =>
  readModelParameters(selectedModel).filter(
    (parameter) =>
      parameter.key &&
      !isCriteriaWeightLikeParameter(parameter) &&
      !isExpertWeightsParameter(parameter)
  );

const getPersistedCreateIssueModelParameters = (selectedModel) =>
  readModelParameters(selectedModel).filter(
    (parameter) => parameter.key && !isCriteriaWeightLikeParameter(parameter)
  );

export const buildCreateIssueParameterDefaults = ({ selectedModel, leafCriteria }) => {
  const parameters = getCreateIssueModelParameters(selectedModel);

  return parameters.reduce((accumulator, parameter) => {
    const key = parameter.key;

    if (isCriterionMapParameter(parameter)) {
      accumulator[key] = buildCriterionMapDefault(parameter, leafCriteria);
      return accumulator;
    }

    accumulator[key] = parameter.default ?? "";
    return accumulator;
  }, {});
};

export const updateCreateIssueParameterValues = ({
  previous,
  selectedModel,
  leafCriteria,
}) => {
  const parameters = getCreateIssueModelParameters(selectedModel);
  const next = isPlainObject(previous) ? { ...previous } : {};
  const criterionRows = buildCriterionParameterRows({ leafCriteria });

  parameters.forEach((parameter) => {
    const key = parameter.key;

    if (!isCriterionMapParameter(parameter)) {
      if (next[key] === undefined) {
        next[key] = parameter.default ?? "";
      }

      return;
    }

    const defaultValue = parameter.default ?? "";

    if (criterionRows.length === 0) {
      next[key] = {};
      return;
    }

    const previousValue = next[key];
    const previousMap = isPlainObject(previousValue) ? previousValue : null;
    const scalarFallback =
      !isPlainObject(previousValue) &&
      previousValue !== undefined &&
      previousValue !== null
        ? previousValue
        : defaultValue;

    next[key] = criterionRows.reduce((accumulator, row) => {
      if (previousMap && Object.prototype.hasOwnProperty.call(previousMap, row.key)) {
        accumulator[row.key] = previousMap[row.key];
        return accumulator;
      }

      accumulator[row.key] = scalarFallback;
      return accumulator;
    }, {});
  });

  return next;
};

export const pruneCreateIssueParameterValues = ({ selectedModel, values }) => {
  const parameters = getPersistedCreateIssueModelParameters(selectedModel);
  const allowedKeys = new Set(parameters.map((parameter) => parameter.key));
  const source = isPlainObject(values) ? values : {};

  return Object.entries(source).reduce((accumulator, [key, value]) => {
    if (allowedKeys.has(key)) {
      accumulator[key] = value;
    }

    return accumulator;
  }, {});
};
