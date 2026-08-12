import { normalizeExpressionDomainNameOrThrow } from "../../shared/validation.js";
import { normalizeLinguistic2TupleCreationDefinition } from "./creation.js";
import {
  getLinguistic2TupleEvaluationLabels,
  normalizeLinguistic2TupleEvaluationValue,
} from "./evaluation.js";

export const linguistic2Tuple = Object.freeze({
  key: "linguistic2Tuple",
  label: "Linguistic 2-Tuple",
  description: "Ordered linguistic labels with symbolic translation values.",
  family: "linguistic",

  validateCreation(payload = {}) {
    const name = normalizeExpressionDomainNameOrThrow(payload?.name);
    const definition = normalizeLinguistic2TupleCreationDefinition(
      payload?.definition
    );

    return {
      name,
      typeKey: "linguistic2Tuple",
      definition,
    };
  },

  validateEvaluation({ value, expressionDomain } = {}) {
    const labels = getLinguistic2TupleEvaluationLabels(expressionDomain);

    return normalizeLinguistic2TupleEvaluationValue({ value, labels });
  },
});
