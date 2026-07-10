import NumericDiscreteCreationForm from "./NumericDiscreteCreationForm";
import NumericDiscreteEvaluationInput from "./NumericDiscreteEvaluationInput";
import { validateNumericDiscreteEvaluation } from "./evaluation";
import { getExpressionDomainTypeMetadataOrThrow } from "../../expressionDomainTypeMetadataCatalog";

export const numericDiscreteExpressionDomainType = Object.freeze({
  ...getExpressionDomainTypeMetadataOrThrow("numericDiscrete"),
  CreationForm: NumericDiscreteCreationForm,
  EvaluationInput: NumericDiscreteEvaluationInput,
  validateEvaluation: validateNumericDiscreteEvaluation,
});
