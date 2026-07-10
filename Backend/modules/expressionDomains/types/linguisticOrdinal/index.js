import { normalizeExpressionDomainNameOrThrow } from "../../shared/validation.js";
import { normalizeLinguisticOrdinalCreationDefinition } from "./creation.js";
import {
  getLinguisticOrdinalEvaluationLabels,
  normalizeLinguisticOrdinalEvaluationValue,
} from "./evaluation.js";

export const linguisticOrdinal = Object.freeze({
  key: "linguisticOrdinal",
  label: "Linguistic Ordinal",
  description: "Ordered linguistic labels represented by discrete label keys.",
  family: "linguistic",

  validateCreation(payload = {}) {
    const name = normalizeExpressionDomainNameOrThrow(payload?.name);
    const definition = normalizeLinguisticOrdinalCreationDefinition(
      payload?.definition
    );

    return {
      name,
      typeKey: "linguisticOrdinal",
      definition,
    };
  },

  validateEvaluation({ value, expressionDomain } = {}) {
    const labels = getLinguisticOrdinalEvaluationLabels(expressionDomain);

    return normalizeLinguisticOrdinalEvaluationValue({
      value,
      labels,
    });
  },
});
