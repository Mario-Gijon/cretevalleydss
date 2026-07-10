import { createBadRequestError } from "../../../../utils/common/errors.js";

export const getLinguisticOrdinalEvaluationLabels = (expressionDomain) => {
  const labels = Array.isArray(expressionDomain?.definition?.labels)
    ? expressionDomain.definition.labels
    : null;

  if (!labels) {
    throw createBadRequestError("Expression domain definition is invalid.", {
      field: "definition",
    });
  }

  return labels;
};

export const normalizeLinguisticOrdinalEvaluationValue = ({ value, labels }) => {
  let labelKey = null;

  if (typeof value === "string") {
    labelKey = value.trim();
  } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    labelKey = typeof value.labelKey === "string" ? value.labelKey.trim() : "";
  }

  if (!labelKey) {
    throw createBadRequestError("Value is required.", {
      field: "value",
    });
  }

  if (!labels.some((item) => item.key === labelKey)) {
    throw createBadRequestError("Value must match one of the configured labels.", {
      field: "value",
    });
  }

  return { labelKey };
};
