import NumericDiscreteCreationForm from "./NumericDiscreteCreationForm";
import NumericDiscreteEvaluationInput from "./NumericDiscreteEvaluationInput";
import { validateNumericDiscreteEvaluation } from "./evaluation";

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
});
