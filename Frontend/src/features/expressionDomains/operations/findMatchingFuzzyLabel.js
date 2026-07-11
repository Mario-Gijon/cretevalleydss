import { getExpressionDomainTypeOrThrow } from "../expressionDomainTypeCatalog.js";

const getLinguisticFuzzyLabelsOrThrow = (expressionDomain) => {
  const labels = Array.isArray(expressionDomain?.definition?.labels)
    ? expressionDomain.definition.labels
    : null;

  if (!labels) {
    throw new Error("Expression domain definition is invalid.");
  }

  return labels;
};

const normalizeFuzzyValuesOrThrow = (values, epsilon) => {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("values must be a non-empty array.");
  }

  if (typeof epsilon !== "number" || !Number.isFinite(epsilon) || epsilon < 0) {
    throw new Error("epsilon must be a non-negative finite number.");
  }

  return values.map((item, index) => {
    if (typeof item !== "number" || !Number.isFinite(item)) {
      throw new Error(`values[${index}] must be a finite number.`);
    }

    return item;
  });
};

const assertLinguisticFuzzyDomainOrThrow = (expressionDomain) => {
  const typeKey = expressionDomain?.typeKey;

  if (typeof typeKey !== "string" || typeKey.trim() === "") {
    throw new Error("expressionDomain.typeKey is required.");
  }

  const normalizedTypeKey = typeKey.trim();
  getExpressionDomainTypeOrThrow(normalizedTypeKey);

  if (normalizedTypeKey !== "linguisticFuzzy") {
    throw new Error(
      "findMatchingFuzzyLabel requires a linguisticFuzzy expression domain."
    );
  }
};

export const findMatchingFuzzyLabel = ({
  values,
  expressionDomain,
  epsilon = 1e-9,
}) => {
  assertLinguisticFuzzyDomainOrThrow(expressionDomain);
  const normalizedValues = normalizeFuzzyValuesOrThrow(values, epsilon);
  const labels = getLinguisticFuzzyLabelsOrThrow(expressionDomain);

  for (const label of labels) {
    const labelValues = Array.isArray(label?.values) ? label.values : null;

    if (!labelValues || labelValues.length !== normalizedValues.length) {
      continue;
    }

    const matches = labelValues.every(
      (item, index) => Math.abs(item - normalizedValues[index]) <= epsilon
    );

    if (matches) {
      return label;
    }
  }

  return null;
};

