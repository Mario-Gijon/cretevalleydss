import {
  isCriterionWeightsParameter,
  resolveParameterScope,
} from "./modelParameter.metadata.js";

export const isMissingParameterValue = (value) =>
  value === undefined || value === null || value === "";

export const resolveCriteriaWeightsDefault = ({
  value,
  parameter,
  leafCriteriaCount,
}) => {
  const isCriterionWeights = isCriterionWeightsParameter({
    parameter,
  });

  if (!isCriterionWeights) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim().toLowerCase() === "equal" &&
    Number.isInteger(leafCriteriaCount) &&
    leafCriteriaCount > 0
  ) {
    return Array.from({ length: leafCriteriaCount }, () => 1);
  }

  return value;
};

export const resolvePerCriterionScalarValue = ({
  value,
  parameter,
  leafCriteriaCount,
}) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (resolveParameterScope(parameter) !== "perCriterion") {
    return value;
  }

  if (!Number.isInteger(leafCriteriaCount) || leafCriteriaCount < 0) {
    return value;
  }

  return Array.from({ length: leafCriteriaCount }, () => value);
};
