import { getExpressionDomainTypeMetadataOrThrow } from "../expressionDomainTypeMetadataCatalog.js";
import { validateFuzzyValuesOrThrow } from "./validateFuzzyValues.js";

const assertLinguisticFuzzyDomainOrThrow = (expressionDomain) => {
  const typeKey = expressionDomain?.typeKey;

  if (typeof typeKey !== "string" || typeKey.trim() === "") {
    throw new Error("expressionDomain.typeKey is required.");
  }

  const normalizedTypeKey = typeKey.trim();
  getExpressionDomainTypeMetadataOrThrow(normalizedTypeKey);

  if (normalizedTypeKey !== "linguisticFuzzy") {
    throw new Error(
      "findMatchingFuzzyLabel requires a linguisticFuzzy expression domain."
    );
  }
};

const getLinguisticFuzzyLabelsOrThrow = (expressionDomain) => {
  const labels = Array.isArray(expressionDomain?.definition?.labels)
    ? expressionDomain.definition.labels
    : null;

  if (!labels) {
    throw new Error("Expression domain definition is invalid.");
  }

  return labels;
};

export const findMatchingFuzzyLabel = ({
  values,
  expressionDomain,
  epsilon = 1e-9,
}) => {
  assertLinguisticFuzzyDomainOrThrow(expressionDomain);
  const normalizedValues = validateFuzzyValuesOrThrow({ values, epsilon });
  const labels = getLinguisticFuzzyLabelsOrThrow(expressionDomain);
  const validatedLabels = labels.map((label, index) => {
    const labelValues = Array.isArray(label?.values) ? label.values : null;

    if (!labelValues) {
      throw new Error("Expression domain definition is invalid.");
    }

    validateFuzzyValuesOrThrow({
      values: labelValues,
      field: `definition.labels[${index}].values`,
      emptyMessage: "Expression domain definition is invalid.",
    });

    return label;
  });

  for (const label of validatedLabels) {
    const labelValues = label.values;
    if (labelValues.length !== normalizedValues.length) {
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
