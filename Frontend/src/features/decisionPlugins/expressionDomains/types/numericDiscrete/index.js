import NumericDiscreteCreationForm from "./NumericDiscreteCreationForm";
import NumericDiscreteEvaluationInput from "./NumericDiscreteEvaluationInput";
import {
  getNumericDiscreteEvaluationDefinition,
  validateNumericDiscreteEvaluation,
} from "./evaluation";

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
    throw new Error(
      "Numeric discrete expression domain does not support pairwise comparison."
    );
  }

  const intervalSteps = (definition.max - definition.min) / definition.step;

  if (Math.abs(intervalSteps - Math.round(intervalSteps)) > EPSILON) {
    throw new Error(
      "Numeric discrete expression domain is not closed under pairwise reflection."
    );
  }

  return definition;
};

const getNumericDiscreteInverseValue = ({ value, expressionDomain } = {}) => {
  const normalizedValue = validateNumericDiscreteEvaluation({
    value,
    expressionDomain,
  });
  const definition = assertNumericDiscretePairwiseSupport({
    expressionDomain,
  });
  const inverseValue = definition.min + definition.max - normalizedValue;

  return validateNumericDiscreteEvaluation({
    value: inverseValue,
    expressionDomain,
  });
};

export const numericDiscreteExpressionDomainType = Object.freeze({
  key: "numericDiscrete",
  label: "Numeric discrete",
  description: "Numeric values within a range using a fixed step.",
  family: "numeric",
  constraintExample: {
    min: 1,
    max: 5,
    step: 1,
  },
  CreationForm: NumericDiscreteCreationForm,
  EvaluationInput: NumericDiscreteEvaluationInput,
  validateEvaluation: validateNumericDiscreteEvaluation,
  pairwiseComparison: Object.freeze({
    assertSupported: assertNumericDiscretePairwiseSupport,
    getInverseValue: getNumericDiscreteInverseValue,
  }),
});
