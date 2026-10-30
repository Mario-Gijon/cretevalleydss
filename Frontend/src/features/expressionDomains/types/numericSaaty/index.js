import NumericSaatyEvaluationInput from "./NumericSaatyEvaluationInput.jsx";
import { validateNumericSaatyEvaluation } from "./evaluation.js";
import { getExpressionDomainTypeMetadataOrThrow } from "../../expressionDomainTypeMetadataCatalog.js";

export const numericSaatyExpressionDomainType = Object.freeze({
  ...getExpressionDomainTypeMetadataOrThrow("numericSaaty"),
  EvaluationInput: NumericSaatyEvaluationInput,
  validateEvaluation: validateNumericSaatyEvaluation,
});
