import { isPlainObject } from "../../../utils/common/objects";

export const isPerCriterionParameter = (parameter) =>
  parameter?.scope === "perCriterion";

export const isCriteriaWeightLikeParameter = (parameter) =>
  parameter.semanticRole === "criteriaWeights";

export const buildCriterionParameterRows = ({ parameterContext }) =>
  (Array.isArray(parameterContext?.leafCriteria)
    ? parameterContext.leafCriteria
    : []
  )
    .map((criterion) => {
      const key = typeof criterion?.id === "string" ? criterion.id.trim() : "";
      return key ? { key, name: criterion?.name || key } : null;
    })
    .filter(Boolean);

export const resolveCriterionRowValue = ({ value, defaultValue, rowKey }) => {
  if (isPlainObject(value) && Object.prototype.hasOwnProperty.call(value, rowKey)) {
    return value[rowKey];
  }

  if (!isPlainObject(value) && value !== undefined && value !== null && value !== "") {
    return value;
  }

  return defaultValue;
};
