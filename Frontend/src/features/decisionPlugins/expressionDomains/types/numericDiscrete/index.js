import NumericDiscreteCreationForm from "./NumericDiscreteCreationForm";
import NumericDiscreteEvaluationInput from "./NumericDiscreteEvaluationInput";

export const numericDiscreteExpressionDomainType = Object.freeze({
  key: "numericDiscrete",
  label: "Numeric discrete",
  description: "Numeric values within a range using a fixed step.",
  family: "numeric",
  CreationForm: NumericDiscreteCreationForm,
  EvaluationInput: NumericDiscreteEvaluationInput,
});

