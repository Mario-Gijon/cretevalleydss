import LinguisticFuzzyCreationForm from "./LinguisticFuzzyCreationForm";
import LinguisticFuzzyEvaluationInput from "./LinguisticFuzzyEvaluationInput";

export const linguisticFuzzyExpressionDomainType = Object.freeze({
  key: "linguisticFuzzy",
  label: "Fuzzy linguistic",
  description: "Linguistic labels represented with membership function values.",
  family: "linguistic",
  constraintExample: {
    membershipFunction: ["triangular"],
    labelCount: [5, 7],
  },
  CreationForm: LinguisticFuzzyCreationForm,
  EvaluationInput: LinguisticFuzzyEvaluationInput,
});
