import { normalizeNonEmptyString } from "../../../utils/common/strings.js";

export const isWithinRange = (value, restrictions = {}) => {
  if (typeof restrictions.min === "number" && value < restrictions.min) {
    return false;
  }

  if (typeof restrictions.max === "number" && value > restrictions.max) {
    return false;
  }

  return true;
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
