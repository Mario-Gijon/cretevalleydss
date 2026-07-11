import { createBadRequestError } from "../../../utils/common/errors.js";
import { getExpressionDomainTypeOrThrow } from "../expressionDomainTypeCatalog.js";
import { validateExpressionDomainEvaluationOrThrow } from "../validateExpressionDomainEvaluation.js";
import { getLinguisticFuzzyEvaluationLabels } from "../types/linguisticFuzzy/evaluation.js";
import { getLinguisticOrdinalEvaluationLabels } from "../types/linguisticOrdinal/evaluation.js";
import {
  assertNumericDiscreteValueStepAligned,
  getNumericDiscreteEvaluationDefinition,
} from "../types/numericDiscrete/evaluation.js";
import { getNumericContinuousEvaluationDefinition } from "../types/numericContinuous/evaluation.js";
import { assertPairwiseReflectionCompatible } from "./assertPairwiseReflectionCompatible.js";

const normalizeExpressionDomainTypeKeyOrThrow = (expressionDomain) => {
  const typeKey = expressionDomain?.typeKey;

  if (typeof typeKey !== "string" || typeKey.trim() === "") {
    throw createBadRequestError("expressionDomain.typeKey is required.", {
      field: "expressionDomain",
    });
  }

  const normalizedTypeKey = typeKey.trim();
  getExpressionDomainTypeOrThrow(normalizedTypeKey);
  return normalizedTypeKey;
};

const assertReflectedFuzzyValuesOrThrow = (values) => {
  for (let index = 0; index < values.length; index += 1) {
    const item = values[index];

    if (typeof item !== "number" || !Number.isFinite(item)) {
      throw createBadRequestError(`Reflected fuzzy value at index ${index} is invalid.`, {
        field: "value",
      });
    }

    if (item < 0 || item > 1) {
      throw createBadRequestError(
        `Reflected fuzzy value at index ${index} must remain between 0 and 1.`,
        { field: "value" }
      );
    }

    if (index > 0 && item < values[index - 1]) {
      throw createBadRequestError("Reflected fuzzy values must remain non-decreasing.", {
        field: "value",
      });
    }
  }
};

export const reflectExpressionDomainValue = ({ value, expressionDomain }) => {
  const typeKey = normalizeExpressionDomainTypeKeyOrThrow(expressionDomain);
  const normalizedValue = validateExpressionDomainEvaluationOrThrow({
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
      } catch (error) {
        throw createBadRequestError(
          "This discrete domain cannot be used for pairwise comparisons because some reflected values do not align with its step.",
          {
            code: "PAIRWISE_REFLECTION_INCOMPATIBLE_DOMAIN",
            field: "expressionDomain.definition.step",
            cause: error,
          }
        );
      }

      return reflectedValue;
    }

    case "linguisticOrdinal": {
      const labels = getLinguisticOrdinalEvaluationLabels(expressionDomain);
      const selectedIndex = labels.findIndex(
        (item) => item?.key === normalizedValue.labelKey
      );
      const reflectedLabel = labels[labels.length - 1 - selectedIndex];

      return { labelKey: reflectedLabel.key };
    }

    case "linguisticFuzzy": {
      const labels = getLinguisticFuzzyEvaluationLabels(expressionDomain);
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
      throw createBadRequestError(
        `Unsupported expression domain type: ${typeKey}`,
        {
          code: "UNSUPPORTED_EXPRESSION_DOMAIN_TYPE",
          field: "typeKey",
        }
      );
  }
};

