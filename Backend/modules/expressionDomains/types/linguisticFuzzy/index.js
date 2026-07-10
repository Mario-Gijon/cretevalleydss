import { normalizeExpressionDomainNameOrThrow } from "../../shared/validation.js";
import { normalizeLinguisticFuzzyCreationDefinition } from "./creation.js";
import {
  getLinguisticFuzzyEvaluationLabels,
  normalizeLinguisticFuzzyEvaluationValue,
} from "./evaluation.js";

export const linguisticFuzzy = Object.freeze({
  key: "linguisticFuzzy",
  label: "Linguistic Fuzzy",
  description: "Linguistic labels backed by fuzzy membership values.",
  family: "linguistic",

  validateCreation(payload = {}) {
    const name = normalizeExpressionDomainNameOrThrow(payload?.name);
    const definition = normalizeLinguisticFuzzyCreationDefinition(
      payload?.definition
    );

    return {
      name,
      typeKey: "linguisticFuzzy",
      family: "linguistic",
      definition,
    };
  },

  validateEvaluation({ value, expressionDomain } = {}) {
    const labels = getLinguisticFuzzyEvaluationLabels(expressionDomain);

    return normalizeLinguisticFuzzyEvaluationValue({
      value,
      labels,
    });
  },
});
