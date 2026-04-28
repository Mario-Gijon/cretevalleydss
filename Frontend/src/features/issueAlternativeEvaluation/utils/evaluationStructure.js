/**
 * Estructuras de evaluación de alternativas soportadas.
 */
export const ISSUE_ALTERNATIVE_EVALUATION_STRUCTURES = {
  DIRECT: "direct",
  PAIRWISE_ALTERNATIVES: "pairwiseAlternatives",
};

const SUPPORTED_STRUCTURES = new Set(
  Object.values(ISSUE_ALTERNATIVE_EVALUATION_STRUCTURES)
);

const normalizeStructureOrNull = (value) => {
  if (!value) return null;
  return SUPPORTED_STRUCTURES.has(value) ? value : null;
};

/**
 * Resuelve la estructura de evaluación de alternativas a partir del issue.
 *
 * @param {Object|null} source
 * @returns {string}
 */
export const resolveIssueAlternativeEvaluationStructure = (source) => {
  const candidates = [
    source?.evaluationStructure,
    source?.summary?.evaluationStructure,
    source?.modelParams?.base?.evaluationStructure,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeStructureOrNull(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return ISSUE_ALTERNATIVE_EVALUATION_STRUCTURES.DIRECT;
};
