import LinguisticFuzzyCreationForm from "./LinguisticFuzzyCreationForm";
import LinguisticFuzzyEvaluationInput from "./LinguisticFuzzyEvaluationInput";

export const linguisticFuzzyExpressionDomainType = Object.freeze({
  key: "linguisticFuzzy",
  label: "Fuzzy linguistic",
  description: "Linguistic labels represented with membership function values.",
  family: "linguistic",
  CreationForm: LinguisticFuzzyCreationForm,
  EvaluationInput: LinguisticFuzzyEvaluationInput,
});

