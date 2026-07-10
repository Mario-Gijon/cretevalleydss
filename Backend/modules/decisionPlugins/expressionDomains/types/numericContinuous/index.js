import { createBadRequestError } from "../../../../../utils/common/errors.js";
import { normalizeExpressionDomainNameOrThrow } from "../../shared/validation.js";
import { normalizeNumericContinuousCreationDefinition } from "./creation.js";
import {
  assertNumericContinuousValueInRange,
  getNumericContinuousEvaluationDefinition,
  normalizeNumericContinuousEvaluationValue,
} from "./evaluation.js";

const assertNumericContinuousPairwiseSupport = ({ expressionDomain } = {}) => {
  const definition = getNumericContinuousEvaluationDefinition(expressionDomain);

  if (
    !Number.isFinite(definition.min) ||
    !Number.isFinite(definition.max) ||
    definition.min >= definition.max
  ) {
    throw createBadRequestError(
      "Numeric continuous expression domain does not support pairwise comparison.",
      {
        field: "definition",
      }
    );
  }

  return definition;
};

const getValidatedNumericContinuousValue = ({ value, expressionDomain } = {}) => {
  const normalizedValue = normalizeNumericContinuousEvaluationValue(value);
  const definition = getNumericContinuousEvaluationDefinition(expressionDomain);

  assertNumericContinuousValueInRange({
    value: normalizedValue,
    definition,
  });

  return normalizedValue;
};

const getNumericContinuousInverseValue = ({ value, expressionDomain } = {}) => {
  const normalizedValue = getValidatedNumericContinuousValue({
    value,
    expressionDomain,
  });
  const definition = assertNumericContinuousPairwiseSupport({
    expressionDomain,
  });
  const inverseValue = definition.min + definition.max - normalizedValue;

  return getValidatedNumericContinuousValue({
    value: inverseValue,
    expressionDomain,
  });
};

export const numericContinuous = Object.freeze({
  key: "numericContinuous",
  label: "Numeric Continuous",
  description: "Continuous numeric domain with a minimum and maximum value.",
  family: "numeric",

  validateCreation(payload = {}) {
    const name = normalizeExpressionDomainNameOrThrow(payload?.name);
    const definition = normalizeNumericContinuousCreationDefinition(
      payload?.definition
    );

    return {
      name,
      typeKey: "numericContinuous",
      family: "numeric",
      definition,
    };
  },

  validateEvaluation({ value, expressionDomain } = {}) {
    return getValidatedNumericContinuousValue({
      value,
      expressionDomain,
    });
  },

  pairwiseComparison: Object.freeze({
    assertSupported: assertNumericContinuousPairwiseSupport,
    getInverseValue: getNumericContinuousInverseValue,
  }),
});
