import { EVALUATION_STRUCTURES } from "./alternativeEvaluations/alternativeEvaluation.constants.js";

export { EVALUATION_STRUCTURES };

const SUPPORTED_EVALUATION_STRUCTURES = new Set(
  Object.values(EVALUATION_STRUCTURES)
);

/**
 * Resuelve la estructura de evaluación desde `evaluationStructure`.
 *
 * Si el campo no viene informado, devuelve `direct` por compatibilidad segura.
 * Si viene informado con un valor no soportado, lanza error explícito.
 *
 * @param {Object|null|undefined} doc Documento a inspeccionar.
 * @returns {string}
 */
export const resolveEvaluationStructure = (doc) => {
  const evaluationStructure = doc?.evaluationStructure;

  if (!evaluationStructure) {
    return EVALUATION_STRUCTURES.DIRECT;
  }

  if (!SUPPORTED_EVALUATION_STRUCTURES.has(evaluationStructure)) {
    throw new Error(
      `Unsupported evaluationStructure '${String(evaluationStructure)}'`
    );
  }

  return evaluationStructure;
};
