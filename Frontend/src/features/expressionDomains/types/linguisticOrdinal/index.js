import LinguisticOrdinalCreationForm from "./LinguisticOrdinalCreationForm";
import LinguisticOrdinalEvaluationInput from "./LinguisticOrdinalEvaluationInput";
import { validateLinguisticOrdinalEvaluation } from "./evaluation";
import { getExpressionDomainTypeMetadataOrThrow } from "../../expressionDomainTypeMetadataCatalog";

export const linguisticOrdinalExpressionDomainType = Object.freeze({
  ...getExpressionDomainTypeMetadataOrThrow("linguisticOrdinal"),
  CreationForm: LinguisticOrdinalCreationForm,
  EvaluationInput: LinguisticOrdinalEvaluationInput,
  validateEvaluation: validateLinguisticOrdinalEvaluation,
});
