import { createBadRequestError } from "../../../../../utils/common/errors.js";
import { normalizeExpressionDomainNameOrThrow } from "../../shared/validation.js";
import { normalizeNumericDiscreteCreationDefinition } from "./creation.js";
import {
  assertNumericDiscreteValueInRange,
  assertNumericDiscreteValueStepAligned,
  getNumericDiscreteEvaluationDefinition,
  normalizeNumericDiscreteEvaluationValue,
} from "./evaluation.js";

const EPSILON = 1e-9;

const assertNumericDiscretePairwiseSupport = ({ expressionDomain } = {}) => {
  const definition = getNumericDiscreteEvaluationDefinition(expressionDomain);

  if (
    !Number.isFinite(definition.min) ||
    !Number.isFinite(definition.max) ||
    definition.min >= definition.max ||
    !Number.isFinite(definition.step) ||
    definition.step <= 0
  ) {
    throw createBadRequestError(
      "Numeric discrete expression domain does not support pairwise comparison.",
      {
        field: "definition",
      }
    );
  }

  const intervalSteps = (definition.max - definition.min) / definition.step;

  if (Math.abs(intervalSteps - Math.round(intervalSteps)) > EPSILON) {
    throw createBadRequestError(
      "Numeric discrete expression domain is not closed under pairwise reflection.",
      {
        field: "definition",
      }
    );
  }

  return definition;
};

const getValidatedNumericDiscreteValue = ({ value, expressionDomain } = {}) => {
  const normalizedValue = normalizeNumericDiscreteEvaluationValue(value);
  const definition = getNumericDiscreteEvaluationDefinition(expressionDomain);

  assertNumericDiscreteValueInRange({
    value: normalizedValue,
    definition,
  });

  assertNumericDiscreteValueStepAligned({
    value: normalizedValue,
    definition,
  });

  return normalizedValue;
};

const getNumericDiscreteInverseValue = ({ value, expressionDomain } = {}) => {
  const normalizedValue = getValidatedNumericDiscreteValue({
    value,
    expressionDomain,
  });
  const definition = assertNumericDiscretePairwiseSupport({
    expressionDomain,
  });
  const inverseValue = definition.min + definition.max - normalizedValue;

  return getValidatedNumericDiscreteValue({
    value: inverseValue,
    expressionDomain,
  });
};

export const numericDiscrete = Object.freeze({
  key: "numericDiscrete",
  label: "Numeric Discrete",
  description: "Discrete numeric domain constrained by minimum, maximum, and step.",
  family: "numeric",

  validateCreation(payload = {}) {
    const name = normalizeExpressionDomainNameOrThrow(payload?.name);
    const definition = normalizeNumericDiscreteCreationDefinition(
      payload?.definition
    );

    return {
      name,
      typeKey: "numericDiscrete",
      family: "numeric",
      definition,
    };
  },

  validateEvaluation({ value, expressionDomain } = {}) {
    return getValidatedNumericDiscreteValue({
      value,
      expressionDomain,
    });
  },

  pairwiseComparison: Object.freeze({
    assertSupported: assertNumericDiscretePairwiseSupport,
    getInverseValue: getNumericDiscreteInverseValue,
  }),
});
