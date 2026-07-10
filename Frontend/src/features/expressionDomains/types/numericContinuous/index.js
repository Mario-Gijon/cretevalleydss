import NumericContinuousCreationForm from "./NumericContinuousCreationForm";
import NumericContinuousEvaluationInput from "./NumericContinuousEvaluationInput";
import { validateNumericContinuousEvaluation } from "./evaluation";

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
});
