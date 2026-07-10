import LinguisticFuzzyCreationForm from "./LinguisticFuzzyCreationForm";
import LinguisticFuzzyEvaluationInput from "./LinguisticFuzzyEvaluationInput";
import { validateLinguisticFuzzyEvaluation } from "./evaluation";
import { getExpressionDomainTypeMetadataOrThrow } from "../../expressionDomainTypeMetadataCatalog";

export const linguisticFuzzyExpressionDomainType = Object.freeze({
  ...getExpressionDomainTypeMetadataOrThrow("linguisticFuzzy"),
  CreationForm: LinguisticFuzzyCreationForm,
  EvaluationInput: LinguisticFuzzyEvaluationInput,
  validateEvaluation: validateLinguisticFuzzyEvaluation,
});
