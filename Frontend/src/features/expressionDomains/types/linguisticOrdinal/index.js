import LinguisticOrdinalCreationForm from "./LinguisticOrdinalCreationForm";
import LinguisticOrdinalEvaluationInput from "./LinguisticOrdinalEvaluationInput";
import { validateLinguisticOrdinalEvaluation } from "./evaluation";

export const linguisticOrdinalExpressionDomainType = Object.freeze({
  key: "linguisticOrdinal",
  label: "Ordered linguistic",
  description: "Ordered linguistic labels without membership functions.",
  family: "linguistic",
  constraintExample: {
    labelCount: [3, 5, 7],
  },
  CreationForm: LinguisticOrdinalCreationForm,
  EvaluationInput: LinguisticOrdinalEvaluationInput,
  validateEvaluation: validateLinguisticOrdinalEvaluation,
});
