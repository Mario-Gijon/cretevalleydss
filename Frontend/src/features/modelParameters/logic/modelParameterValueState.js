import { isPlainObject } from "../../../utils/common/objects";
import { buildParameterContext } from "./buildModelParameterContext";
import {
  buildCriterionParameterRows,
  isCriteriaWeightLikeParameter,
  isPerCriterionParameter,
} from "./modelParameterCriteria";

const readModelParameters = (selectedModel) =>
  Array.isArray(selectedModel?.parameters) ? selectedModel.parameters : [];

const buildCreateIssueParameterContext = ({ selectedModel, leafCriteria }) =>
  buildParameterContext({
    model: selectedModel,
    alternatives: [],
    criteriaTree: [],
    leafCriteria,
  });

const buildCriterionMapDefault = (parameter, parameterContext) => {
  const rows = buildCriterionParameterRows({ parameterContext });
  const defaultValue = parameter.default ?? "";

  return rows.reduce((accumulator, row) => {
    accumulator[row.key] = defaultValue;
    return accumulator;
  }, {});
};

export const getCreateIssueModelParameters = (selectedModel) =>
  readModelParameters(selectedModel).filter(
    (parameter) => parameter.key && !isCriteriaWeightLikeParameter(parameter)
  );

export const buildCreateIssueParameterDefaults = ({ selectedModel, leafCriteria }) => {
  const parameters = getCreateIssueModelParameters(selectedModel);
  const parameterContext = buildCreateIssueParameterContext({
    selectedModel,
    leafCriteria,
  });

  return parameters.reduce((accumulator, parameter) => {
    const key = parameter.key;

    if (isPerCriterionParameter(parameter)) {
      accumulator[key] = buildCriterionMapDefault(parameter, parameterContext);
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
  const previousValues = isPlainObject(previous) ? previous : {};
  const next = {};
  const parameterContext = buildCreateIssueParameterContext({
    selectedModel,
    leafCriteria,
  });
  const criterionRows = buildCriterionParameterRows({ parameterContext });

  parameters.forEach((parameter) => {
    const key = parameter.key;

    if (!isPerCriterionParameter(parameter)) {
      next[key] = Object.prototype.hasOwnProperty.call(previousValues, key)
        ? previousValues[key]
        : parameter.default ?? "";

      return;
    }

    const defaultValue = parameter.default ?? "";

    if (criterionRows.length === 0) {
      next[key] = {};
      return;
    }

    const previousValue = previousValues[key];
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
  const parameters = getCreateIssueModelParameters(selectedModel);
  const allowedKeys = new Set(parameters.map((parameter) => parameter.key));
  const source = isPlainObject(values) ? values : {};

  return Object.entries(source).reduce((accumulator, [key, value]) => {
    if (allowedKeys.has(key)) {
      accumulator[key] = value;
    }

    return accumulator;
  }, {});
};
