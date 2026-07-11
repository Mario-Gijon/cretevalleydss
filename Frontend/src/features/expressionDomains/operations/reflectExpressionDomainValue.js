import { getExpressionDomainTypeMetadataOrThrow } from "../expressionDomainTypeMetadataCatalog.js";
import { validateLinguisticFuzzyEvaluation } from "../types/linguisticFuzzy/evaluation.js";
import { validateLinguisticOrdinalEvaluation } from "../types/linguisticOrdinal/evaluation.js";
import { validateNumericContinuousEvaluation } from "../types/numericContinuous/evaluation.js";
import { assertPairwiseReflectionCompatible } from "./assertPairwiseReflectionCompatible.js";
import { getNumericContinuousEvaluationDefinition } from "../types/numericContinuous/evaluation.js";
import {
  assertNumericDiscreteValueStepAligned,
  getNumericDiscreteEvaluationDefinition,
  validateNumericDiscreteEvaluation,
} from "../types/numericDiscrete/evaluation.js";
import { validateFuzzyValuesOrThrow } from "./validateFuzzyValues.js";

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
  getExpressionDomainTypeMetadataOrThrow(normalizedTypeKey);
  return normalizedTypeKey;
};

export const reflectExpressionDomainValue = ({ value, expressionDomain }) => {
  const typeKey = normalizeExpressionDomainTypeKeyOrThrow(expressionDomain);

  switch (typeKey) {
    case "numericContinuous": {
      const normalizedValue = validateNumericContinuousEvaluation({
        value,
        expressionDomain,
      });
      const definition = getNumericContinuousEvaluationDefinition(expressionDomain);
      return definition.min + definition.max - normalizedValue;
    }

    case "numericDiscrete": {
      const normalizedValue = validateNumericDiscreteEvaluation({
        value,
        expressionDomain,
      });
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
      const normalizedValue = validateLinguisticOrdinalEvaluation({
        value,
        expressionDomain,
      });
      const labels = getLinguisticOrdinalLabelsOrThrow(expressionDomain);
      const selectedIndex = labels.findIndex(
        (item) => item?.key === normalizedValue.labelKey
      );
      const reflectedLabel = labels[labels.length - 1 - selectedIndex];

      return { labelKey: reflectedLabel.key };
    }

    case "linguisticFuzzy": {
      const normalizedValue = validateLinguisticFuzzyEvaluation({
        value,
        expressionDomain,
      });
      const labels = getLinguisticFuzzyLabelsOrThrow(expressionDomain);
      const selectedLabel = labels.find(
        (item) => item?.key === normalizedValue.labelKey
      );
      validateFuzzyValuesOrThrow({
        values: selectedLabel?.values,
        field: "definition.labels",
        emptyMessage: "Expression domain definition is invalid.",
      });
      const reflectedValues = selectedLabel.values
        .slice()
        .reverse()
        .map((item) => 1 - item);

      validateFuzzyValuesOrThrow({
        values: reflectedValues,
        field: "value",
      });

      return { values: reflectedValues };
    }

    default:
      throw new Error(
        `[expressionDomains] Unsupported expression domain type key "${typeKey}".`
      );
  }
};
