import NumericContinuousCreationForm from "./NumericContinuousCreationForm";
import NumericContinuousEvaluationInput from "./NumericContinuousEvaluationInput";
import {
  getNumericContinuousEvaluationDefinition,
  validateNumericContinuousEvaluation,
} from "./evaluation";

const assertNumericContinuousPairwiseSupport = ({ expressionDomain } = {}) => {
  const definition = getNumericContinuousEvaluationDefinition(expressionDomain);

  if (
    !Number.isFinite(definition.min) ||
    !Number.isFinite(definition.max) ||
    definition.min >= definition.max
  ) {
    throw new Error(
      "Numeric continuous expression domain does not support pairwise comparison."
    );
  }

  return definition;
};

const getNumericContinuousInverseValue = ({ value, expressionDomain } = {}) => {
  const normalizedValue = validateNumericContinuousEvaluation({
    value,
    expressionDomain,
  });
  const definition = assertNumericContinuousPairwiseSupport({
    expressionDomain,
  });
  const inverseValue = definition.min + definition.max - normalizedValue;

  return validateNumericContinuousEvaluation({
    value: inverseValue,
    expressionDomain,
  });
};

export const numericContinuousExpressionDomainType = Object.freeze({
  key: "numericContinuous",
  label: "Numeric continuous",
  description: "Numeric values within a continuous range.",
  family: "numeric",
  constraintExample: {
    min: 0,
    max: 1,
  },
  CreationForm: NumericContinuousCreationForm,
  EvaluationInput: NumericContinuousEvaluationInput,
  validateEvaluation: validateNumericContinuousEvaluation,
  pairwiseComparison: Object.freeze({
    assertSupported: assertNumericContinuousPairwiseSupport,
    getInverseValue: getNumericContinuousInverseValue,
  }),
});
