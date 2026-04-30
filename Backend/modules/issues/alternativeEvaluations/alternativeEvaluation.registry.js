import { createBadRequestError } from "../../../utils/common/errors.js";

import { directAlternativeEvaluations } from "./direct/index.js";
import { pairwiseAlternativeEvaluations } from "./pairwiseAlternatives/index.js";

export const ALTERNATIVE_EVALUATION_STRUCTURES_BY_KEY = Object.freeze({
  [directAlternativeEvaluations.key]: directAlternativeEvaluations,
  [pairwiseAlternativeEvaluations.key]: pairwiseAlternativeEvaluations,
});

export const getAlternativeEvaluationStructure = (evaluationStructure) => {
  return ALTERNATIVE_EVALUATION_STRUCTURES_BY_KEY[evaluationStructure] || null;
};

export const getAlternativeEvaluationStructureOrThrow = (
  evaluationStructure
) => {
  const structure = getAlternativeEvaluationStructure(evaluationStructure);

  if (!structure) {
    throw createBadRequestError(
      `Unsupported evaluation structure: ${String(evaluationStructure)}`,
      {
        code: "UNSUPPORTED_EVALUATION_STRUCTURE",
        field: "evaluationStructure",
      }
    );
  }

  return structure;
};
