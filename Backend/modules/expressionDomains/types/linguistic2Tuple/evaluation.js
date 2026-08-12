import { createBadRequestError } from "../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../utils/common/objects.js";

export const getLinguistic2TupleEvaluationLabels = (expressionDomain) => {
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

export const normalizeLinguistic2TupleEvaluationValue = ({ value, labels }) => {
  if (!isPlainObject(value) || Object.keys(value).length !== 2 || !Object.hasOwn(value, "labelKey") || !Object.hasOwn(value, "alpha")) {
    throw createBadRequestError(
      "Value must be an object with exactly labelKey and alpha.",
      { field: "value" }
    );
  }

  if (typeof value.labelKey !== "string" || !value.labelKey.trim()) {
    throw createBadRequestError("value.labelKey is required.", {
      field: "value.labelKey",
    });
  }

  if (typeof value.alpha !== "number" || !Number.isFinite(value.alpha)) {
    throw createBadRequestError("value.alpha must be a finite number.", {
      field: "value.alpha",
    });
  }

  const labelKey = value.labelKey.trim();
  const matchingLabels = labels.filter((item) => item?.key === labelKey);

  if (matchingLabels.length !== 1) {
    throw createBadRequestError("Value must match one of the configured labels.", {
      field: "value.labelKey",
    });
  }

  if (value.alpha < -0.5 || value.alpha >= 0.5) {
    throw createBadRequestError("value.alpha must be greater than or equal to -0.5 and less than 0.5.", {
      field: "value.alpha",
    });
  }

  const labelIndex = labels.indexOf(matchingLabels[0]);
  const beta = labelIndex + value.alpha;
  const maximumIndex = labels.length - 1;

  if (beta < 0 || beta > maximumIndex) {
    throw createBadRequestError("value.labelKey and value.alpha produce an out-of-range linguistic position.", {
      field: "value",
    });
  }

  return { labelKey, alpha: value.alpha };
};
