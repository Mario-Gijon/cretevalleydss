import { toIdString } from "../../../../utils/common/ids.js";

/**
 * Extrae una lista de ids normalizados desde una colección.
 *
 * @param {Array<any>} [items=[]] Colección de entrada.
 * @returns {Array<string>}
 */
const getEntityIds = (items = []) => {
  return items.map(toIdString).filter(Boolean);
};

/**
 * Construye los pares de comparación entre alternativas.
 *
 * @param {Array<any>} [alternatives=[]] Alternativas del issue.
 * @param {Object} [options={}] Opciones de construcción.
 * @returns {Array<Object>}
 */
export const buildAlternativeComparisonPairs = (
  alternatives = [],
  { includeReciprocal = false } = {}
) => {
  const alternativeIds = getEntityIds(alternatives);
  const pairs = [];

  for (let i = 0; i < alternativeIds.length; i += 1) {
    for (let j = i + 1; j < alternativeIds.length; j += 1) {
      pairs.push({
        alternative: alternativeIds[i],
        comparedAlternative: alternativeIds[j],
      });

      if (includeReciprocal) {
        pairs.push({
          alternative: alternativeIds[j],
          comparedAlternative: alternativeIds[i],
        });
      }
    }
  }

  return pairs;
};

/**
 * Construye los documentos iniciales de Evaluation para estructura pairwise.
 *
 * @param {Object} params Datos necesarios para construir las evaluaciones.
 * @returns {Array<Object>}
 */
export const buildInitialPairwiseEvaluations = ({
  issueId,
  experts = [],
  leafCriteria = [],
  alternatives = [],
  consensusPhase = 1,
  includeReciprocal = false,
}) => {
  const issue = toIdString(issueId);
  const expertIds = getEntityIds(experts);
  const criterionIds = getEntityIds(leafCriteria);
  const alternativeIds = getEntityIds(alternatives);

  if (!issue || !expertIds.length || !criterionIds.length || !alternativeIds.length) {
    return [];
  }

  const alternativePairs = buildAlternativeComparisonPairs(alternatives, {
    includeReciprocal,
  });
  const docs = [];

  for (const expert of expertIds) {
    for (const criterion of criterionIds) {
      for (const pair of alternativePairs) {
        docs.push({
          issue,
          expert,
          criterion,
          alternative: pair.alternative,
          comparedAlternative: pair.comparedAlternative,
          completed: false,
          consensusPhase,
        });
      }
    }
  }

  return docs;
};
