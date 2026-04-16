/**
 * Estructuras de evaluación de alternativas soportadas.
 */
export const ISSUE_ALTERNATIVE_EVALUATION_STRUCTURES = {
  DIRECT: "direct",
  PAIRWISE_ALTERNATIVES: "pairwiseAlternatives",
};

/**
 * Resuelve la estructura de evaluación de alternativas a partir del issue.
 *
 * Mantiene compatibilidad con la forma nueva y con el fallback legacy
 * basado en isPairwise.
 *
 * @param {Object|null} source
 * @returns {string}
 */
export const resolveIssueAlternativeEvaluationStructure = (source) => {
  if (source?.evaluationStructure) {
    return source.evaluationStructure;
  }

  if (source?.summary?.evaluationStructure) {
    return source.summary.evaluationStructure;
  }

  if (source?.modelParams?.base?.evaluationStructure) {
    return source.modelParams.base.evaluationStructure;
  }

  if (source?.isPairwise === true || source?.summary?.isPairwise === true) {
    return ISSUE_ALTERNATIVE_EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES;
  }

  return ISSUE_ALTERNATIVE_EVALUATION_STRUCTURES.DIRECT;
};