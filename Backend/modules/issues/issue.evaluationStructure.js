import { createBadRequestError } from "../../utils/common/errors.js";

export const EVALUATION_STRUCTURES = Object.freeze({
  DIRECT: "direct",
  PAIRWISE_ALTERNATIVES: "pairwiseAlternatives",
});

const SUPPORTED_EVALUATION_STRUCTURES = new Set(
  Object.values(EVALUATION_STRUCTURES)
);

/**
 * Valida una estructura de evaluación legacy.
 *
 * @param {string} evaluationStructure Estructura recibida.
 * @returns {string}
 */
export const validateEvaluationStructureOrThrow = (evaluationStructure) => {
  if (!SUPPORTED_EVALUATION_STRUCTURES.has(evaluationStructure)) {
    throw createBadRequestError(
      `Unsupported evaluation structure '${evaluationStructure}'`,
      {
        field: "evaluationStructure",
      }
    );
  }

  return evaluationStructure;
};