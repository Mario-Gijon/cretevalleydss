import { createBadRequestError } from "../../../utils/common/errors.js";
import { getExpressionDomainTypeOrThrow } from "../expressionDomainTypeCatalog.js";
import { getLinguisticFuzzyEvaluationLabels } from "../types/linguisticFuzzy/evaluation.js";

const normalizeFuzzyValuesOrThrow = (values, { epsilon = 1e-9 } = {}) => {
  if (!Array.isArray(values) || values.length === 0) {
    throw createBadRequestError("values must be a non-empty array.", {
      field: "values",
    });
  }

  if (typeof epsilon !== "number" || !Number.isFinite(epsilon) || epsilon < 0) {
    throw createBadRequestError("epsilon must be a non-negative finite number.", {
      field: "epsilon",
    });
  }

  return values.map((item, index) => {
    if (typeof item !== "number" || !Number.isFinite(item)) {
      throw createBadRequestError(`values[${index}] must be a finite number.`, {
        field: `values[${index}]`,
      });
    }

    return item;
  });
};

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
  const normalizedValues = normalizeFuzzyValuesOrThrow(values, { epsilon });
  const labels = getLinguisticFuzzyEvaluationLabels(expressionDomain);

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

