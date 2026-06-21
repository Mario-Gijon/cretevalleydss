import { normalizeNonEmptyString } from "./parameterValues.js";

export const isWithinRange = (value, restrictions = {}) => {
  if (typeof restrictions.min === "number" && value < restrictions.min) {
    return false;
  }

  if (typeof restrictions.max === "number" && value > restrictions.max) {
    return false;
  }

  return true;
};

export const validateOrderedRule = (values, orderedRule) => {
  if (!orderedRule || values.length < 2) {
    return true;
  }

  if (orderedRule === "strictIncreasing") {
    for (let index = 1; index < values.length; index += 1) {
      if (!(values[index - 1] < values[index])) {
        return false;
      }
    }
    return true;
  }

  if (orderedRule === "nonDecreasing") {
    for (let index = 1; index < values.length; index += 1) {
      if (!(values[index - 1] <= values[index])) {
        return false;
      }
    }
    return true;
  }

  return false;
};

export const resolveExpectedArrayLength = ({
  parameter,
  leafCriteria,
}) => {
  const scope = normalizeNonEmptyString(parameter?.scope);
  const configuredLength = parameter?.restrictions?.length;

  if (scope === "perCriterion") {
    return leafCriteria.length;
  }

  if (typeof configuredLength === "number" && Number.isInteger(configuredLength)) {
    return configuredLength;
  }

  return null;
};
