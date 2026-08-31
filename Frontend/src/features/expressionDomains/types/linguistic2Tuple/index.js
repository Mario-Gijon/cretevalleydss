import { getExpressionDomainTypeMetadataOrThrow } from "../../expressionDomainTypeMetadataCatalog";
import Linguistic2TupleCreationForm from "./Linguistic2TupleCreationForm";
import Linguistic2TupleEvaluationInput from "./Linguistic2TupleEvaluationInput";
import { validateLinguistic2TupleEvaluation } from "./evaluation";

export const linguistic2TupleExpressionDomainType = Object.freeze({
  ...getExpressionDomainTypeMetadataOrThrow("linguistic2Tuple"),
  CreationForm: Linguistic2TupleCreationForm,
  EvaluationInput: Linguistic2TupleEvaluationInput,
  collectiveValueDisplay: "replaceReadOnly",
  validateEvaluation: validateLinguistic2TupleEvaluation,
});
