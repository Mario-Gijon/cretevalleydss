import NumericContinuousCreationForm from "./NumericContinuousCreationForm";
import NumericContinuousEvaluationInput from "./NumericContinuousEvaluationInput";
import { validateNumericContinuousEvaluation } from "./evaluation";
import { getExpressionDomainTypeMetadataOrThrow } from "../../expressionDomainTypeMetadataCatalog";

export const numericContinuousExpressionDomainType = Object.freeze({
  ...getExpressionDomainTypeMetadataOrThrow("numericContinuous"),
  CreationForm: NumericContinuousCreationForm,
  EvaluationInput: NumericContinuousEvaluationInput,
  validateEvaluation: validateNumericContinuousEvaluation,
});
