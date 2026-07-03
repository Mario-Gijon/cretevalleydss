import LinguisticOrdinalCreationForm from "./LinguisticOrdinalCreationForm";
import LinguisticOrdinalEvaluationInput from "./LinguisticOrdinalEvaluationInput";

export const linguisticOrdinalExpressionDomainType = Object.freeze({
  key: "linguisticOrdinal",
  label: "Ordered linguistic",
  description: "Ordered linguistic labels without membership functions.",
  family: "linguistic",
  CreationForm: LinguisticOrdinalCreationForm,
  EvaluationInput: LinguisticOrdinalEvaluationInput,
});

