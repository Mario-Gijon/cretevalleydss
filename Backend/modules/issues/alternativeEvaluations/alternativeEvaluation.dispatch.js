import { createBadRequestError } from "../../../utils/common/errors.js";

import { EVALUATION_STRUCTURES } from "./alternativeEvaluation.constants.js";
import { directAlternativeEvaluationHandlers } from "./alternativeEvaluation.direct.js";
import { pairwiseAlternativesEvaluationHandlers } from "./alternativeEvaluation.pairwiseAlternatives.js";

export const ALTERNATIVE_EVALUATION_HANDLERS = Object.freeze({
  [EVALUATION_STRUCTURES.DIRECT]: directAlternativeEvaluationHandlers,
  [EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES]:
    pairwiseAlternativesEvaluationHandlers,
});

export const getSupportedAlternativeEvaluationStructures = () =>
  Object.keys(ALTERNATIVE_EVALUATION_HANDLERS);

export const isSupportedAlternativeEvaluationStructure = (
  evaluationStructure
) =>
  typeof evaluationStructure === "string" &&
  Object.prototype.hasOwnProperty.call(
    ALTERNATIVE_EVALUATION_HANDLERS,
    evaluationStructure
  );

export const getAlternativeEvaluationHandler = (evaluationStructure) => {
  if (isSupportedAlternativeEvaluationStructure(evaluationStructure)) {
    return ALTERNATIVE_EVALUATION_HANDLERS[evaluationStructure];
  }

  throw createBadRequestError(
    `Unsupported evaluation structure: ${String(evaluationStructure)}`,
    {
      code: "UNSUPPORTED_EVALUATION_STRUCTURE",
      field: "evaluationStructure",
      details: {
        supported: getSupportedAlternativeEvaluationStructures(),
      },
    }
  );
};
