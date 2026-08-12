import { isPlainObject } from "../../../../utils/common/objects";

const getEvaluationLabels = (expressionDomain) => {
  const labels = Array.isArray(expressionDomain?.definition?.labels)
    ? expressionDomain.definition.labels
    : null;

  if (!labels) {
    throw new Error("Expression domain definition is invalid.");
  }

  return labels;
};

export const validateLinguistic2TupleEvaluation = ({
  value,
  expressionDomain,
} = {}) => {
  if (
    !isPlainObject(value) ||
    Object.keys(value).length !== 2 ||
    !Object.hasOwn(value, "labelKey") ||
    !Object.hasOwn(value, "alpha")
  ) {
    throw new Error("Value must be an object with exactly labelKey and alpha.");
  }

  const labelKey = typeof value.labelKey === "string" ? value.labelKey.trim() : "";

  if (!labelKey) {
    throw new Error("value.labelKey is required.");
  }

  if (typeof value.alpha !== "number" || !Number.isFinite(value.alpha)) {
    throw new Error("value.alpha must be a finite number.");
  }

  const labels = getEvaluationLabels(expressionDomain);
  const matchingLabels = labels.filter((item) => item?.key === labelKey);

  if (matchingLabels.length !== 1) {
    throw new Error("Select a valid domain label.");
  }

  if (value.alpha < -0.5 || value.alpha >= 0.5) {
    throw new Error("value.alpha must be greater than or equal to -0.5 and less than 0.5.");
  }

  const labelIndex = labels.indexOf(matchingLabels[0]);
  const beta = labelIndex + value.alpha;

  if (beta < 0 || beta > labels.length - 1) {
    throw new Error("value.labelKey and value.alpha produce an out-of-range linguistic position.");
  }

  return { labelKey, alpha: value.alpha };
};
