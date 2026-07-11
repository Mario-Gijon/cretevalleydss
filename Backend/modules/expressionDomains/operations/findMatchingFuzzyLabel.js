import { createBadRequestError } from "../../../utils/common/errors.js";
import { getExpressionDomainTypeOrThrow } from "../expressionDomainTypeCatalog.js";
import { getLinguisticFuzzyEvaluationLabels } from "../types/linguisticFuzzy/evaluation.js";
import { validateFuzzyValuesOrThrow } from "./validateFuzzyValues.js";

const assertLinguisticFuzzyDomainOrThrow = (expressionDomain) => {
  const typeKey = expressionDomain?.typeKey;

  if (typeof typeKey !== "string" || typeKey.trim() === "") {
    throw createBadRequestError("expressionDomain.typeKey is required.", {
      field: "expressionDomain",
    });
  }

  const normalizedTypeKey = typeKey.trim();
  getExpressionDomainTypeOrThrow(normalizedTypeKey);

  if (normalizedTypeKey !== "linguisticFuzzy") {
    throw createBadRequestError(
      "findMatchingFuzzyLabel requires a linguisticFuzzy expression domain.",
      {
        field: "expressionDomain.typeKey",
      }
    );
  }
};

export const findMatchingFuzzyLabel = ({
  values,
  expressionDomain,
  epsilon = 1e-9,
}) => {
  assertLinguisticFuzzyDomainOrThrow(expressionDomain);
  const normalizedValues = validateFuzzyValuesOrThrow({ values, epsilon });
  const labels = getLinguisticFuzzyEvaluationLabels(expressionDomain);

  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];
    const labelValues = Array.isArray(label?.values) ? label.values : null;

    if (!labelValues) {
      throw createBadRequestError("Expression domain definition is invalid.", {
        field: `definition.labels[${index}].values`,
      });
    }

    validateFuzzyValuesOrThrow({
      values: labelValues,
      field: `definition.labels[${index}].values`,
      emptyMessage: "Expression domain definition is invalid.",
    });

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
