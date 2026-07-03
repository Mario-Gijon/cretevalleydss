import NumericContinuousCreationForm from "./NumericContinuousCreationForm";
import NumericContinuousEvaluationInput from "./NumericContinuousEvaluationInput";

export const numericContinuousExpressionDomainType = Object.freeze({
  key: "numericContinuous",
  label: "Numeric continuous",
  description: "Numeric values within a continuous range.",
  family: "numeric",
  CreationForm: NumericContinuousCreationForm,
  EvaluationInput: NumericContinuousEvaluationInput,
});

