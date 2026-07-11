import { getExpressionDomainTypeOrThrow } from "../expressionDomainTypeCatalog.js";
import { validateExpressionDomainEvaluation } from "../validateExpressionDomainEvaluation.js";
import { assertPairwiseReflectionCompatible } from "./assertPairwiseReflectionCompatible.js";
import { getNumericContinuousEvaluationDefinition } from "../types/numericContinuous/evaluation.js";
import {
  assertNumericDiscreteValueStepAligned,
  getNumericDiscreteEvaluationDefinition,
} from "../types/numericDiscrete/evaluation.js";

const getLinguisticOrdinalLabelsOrThrow = (expressionDomain) => {
  const labels = Array.isArray(expressionDomain?.definition?.labels)
    ? expressionDomain.definition.labels
    : null;

  if (!labels) {
    throw new Error("Expression domain definition is invalid.");
  }

  return labels;
};

const getLinguisticFuzzyLabelsOrThrow = getLinguisticOrdinalLabelsOrThrow;

const normalizeExpressionDomainTypeKeyOrThrow = (expressionDomain) => {
  const typeKey = expressionDomain?.typeKey;

  if (typeof typeKey !== "string" || typeKey.trim() === "") {
    throw new Error("expressionDomain.typeKey is required.");
  }

  const normalizedTypeKey = typeKey.trim();
  getExpressionDomainTypeOrThrow(normalizedTypeKey);
  return normalizedTypeKey;
};

const assertReflectedFuzzyValuesOrThrow = (values) => {
  for (let index = 0; index < values.length; index += 1) {
    const item = values[index];

    if (typeof item !== "number" || !Number.isFinite(item)) {
      throw new Error(`Reflected fuzzy value at index ${index} is invalid.`);
    }

    if (item < 0 || item > 1) {
      throw new Error(
        `Reflected fuzzy value at index ${index} must remain between 0 and 1.`
      );
    }

    if (index > 0 && item < values[index - 1]) {
      throw new Error("Reflected fuzzy values must remain non-decreasing.");
    }
  }
};

export const reflectExpressionDomainValue = ({ value, expressionDomain }) => {
  const typeKey = normalizeExpressionDomainTypeKeyOrThrow(expressionDomain);
  const normalizedValue = validateExpressionDomainEvaluation({
    value,
    expressionDomain,
  });

  switch (typeKey) {
    case "numericContinuous": {
      const definition = getNumericContinuousEvaluationDefinition(expressionDomain);
      return definition.min + definition.max - normalizedValue;
    }

    case "numericDiscrete": {
      assertPairwiseReflectionCompatible(expressionDomain);
      const definition = getNumericDiscreteEvaluationDefinition(expressionDomain);
      const reflectedValue = definition.min + definition.max - normalizedValue;

      try {
        assertNumericDiscreteValueStepAligned({
          value: reflectedValue,
          definition,
        });
      } catch {
        throw new Error(
          "This discrete domain cannot be used for pairwise comparisons because some reflected values do not align with its step."
        );
      }

      return reflectedValue;
    }

    case "linguisticOrdinal": {
      const labels = getLinguisticOrdinalLabelsOrThrow(expressionDomain);
      const selectedIndex = labels.findIndex(
        (item) => item?.key === normalizedValue.labelKey
      );
      const reflectedLabel = labels[labels.length - 1 - selectedIndex];

      return { labelKey: reflectedLabel.key };
    }

    case "linguisticFuzzy": {
      const labels = getLinguisticFuzzyLabelsOrThrow(expressionDomain);
      const selectedLabel = labels.find(
        (item) => item?.key === normalizedValue.labelKey
      );
      const reflectedValues = selectedLabel.values
        .slice()
        .reverse()
        .map((item) => 1 - item);

      assertReflectedFuzzyValuesOrThrow(reflectedValues);

      return { values: reflectedValues };
    }

    default:
      throw new Error(
        `[expressionDomains] Unsupported expression domain type key "${typeKey}".`
      );
  }
};

