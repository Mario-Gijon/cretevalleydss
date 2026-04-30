import { EVALUATION_STRUCTURES } from "./alternativeEvaluations/alternativeEvaluation.constants.js";

export { EVALUATION_STRUCTURES };

const SUPPORTED_EVALUATION_STRUCTURES = new Set(
  Object.values(EVALUATION_STRUCTURES)
);

/**
 * Valida la estructura de evaluación.
 *
 * Si el campo no viene informado, lanza error explícito.
 * Si viene informado con un valor no soportado, lanza error explícito.
 *
 * @param {string|null|undefined} evaluationStructure Estructura de evaluación.
 * @returns {string}
 */
export const validateEvaluationStructureOrThrow = (evaluationStructure) => {
  if (!evaluationStructure) {
    throw new Error("evaluationStructure is required");
  }

  if (!SUPPORTED_EVALUATION_STRUCTURES.has(evaluationStructure)) {
    throw new Error(
      `Unsupported evaluationStructure '${String(evaluationStructure)}'`
    );
  }

  return evaluationStructure;
};
