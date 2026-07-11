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
import { validateFuzzyValuesOrThrow } from "./validateFuzzyValues.js";

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
      throw createBadRequestError(
        `Unsupported expression domain type: ${typeKey}`,
        {
          code: "UNSUPPORTED_EXPRESSION_DOMAIN_TYPE",
          field: "typeKey",
        }
      );
  }
};
