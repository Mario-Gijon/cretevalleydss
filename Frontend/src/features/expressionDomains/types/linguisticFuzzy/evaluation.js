import { normalizeLabelKeyValue } from "../../expressionDomainFormFields";

const getEvaluationLabels = (expressionDomain) => {
  const labels = Array.isArray(expressionDomain?.definition?.labels)
    ? expressionDomain.definition.labels
    : null;

  if (!labels) {
    throw new Error("Expression domain definition is invalid.");
  }

  return labels;
};

export const validateLinguisticFuzzyEvaluation = ({
  value,
  expressionDomain,
} = {}) => {
  const labels = getEvaluationLabels(expressionDomain);
  const labelKey = normalizeLabelKeyValue(value).trim();

  if (!labelKey || !labels.some((item) => item?.key === labelKey)) {
    throw new Error("Select a valid domain label.");
  }

  return { labelKey };
};
