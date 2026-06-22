import { isPlainObject } from "./isPlainObject";

export const isCriterionMapParameter = (parameter) =>
  parameter.type === "criterionMap" ||
  parameter.parameterStructureKey === "numberCriterion" ||
  parameter.parameterStructureKey === "selectCriterion";

export const isCriteriaWeightLikeParameter = (parameter) =>
  parameter.semanticRole === "criteriaWeights";

export const buildCriterionParameterRows = ({ parameterContext }) =>
  parameterContext.leafCriteria.map((criterion) => ({
    key: criterion.id,
    name: criterion.name,
  }));

export const resolveCriterionRowValue = ({ value, defaultValue, rowKey }) => {
  if (isPlainObject(value) && Object.prototype.hasOwnProperty.call(value, rowKey)) {
    return value[rowKey];
  }

  if (!isPlainObject(value) && value !== undefined && value !== null && value !== "") {
    return value;
  }

  return defaultValue;
};
