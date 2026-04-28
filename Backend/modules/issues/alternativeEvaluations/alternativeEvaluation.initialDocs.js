import { toIdString } from "../../../utils/common/ids.js";
import { resolveEvaluationStructure } from "../issue.evaluationStructure.js";

import { EVALUATION_STRUCTURES } from "./alternativeEvaluation.constants.js";

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
 * Construye los documentos iniciales de Evaluation para un issue.
 *
 * @param {Object} params Datos necesarios para construir las evaluaciones.
 * @returns {Array<Object>}
 */
export const buildInitialEvaluationDocs = ({
  issueId,
  experts = [],
  leafCriteria = [],
  alternatives = [],
  evaluationStructure = EVALUATION_STRUCTURES.DIRECT,
  consensusPhase = 1,
  includeReciprocal = false,
}) => {
  const issue = toIdString(issueId);
  const expertIds = getEntityIds(experts);
  const criterionIds = getEntityIds(leafCriteria);
  const alternativeIds = getEntityIds(alternatives);
  const resolvedEvaluationStructure = resolveEvaluationStructure({
    evaluationStructure,
  });

  if (!issue || !expertIds.length || !criterionIds.length || !alternativeIds.length) {
    return [];
  }

  const docs = [];

  if (resolvedEvaluationStructure === EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES) {
    const alternativePairs = buildAlternativeComparisonPairs(alternatives, {
      includeReciprocal,
    });

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
  }

  for (const expert of expertIds) {
    for (const criterion of criterionIds) {
      for (const alternative of alternativeIds) {
        docs.push({
          issue,
          expert,
          criterion,
          alternative,
          comparedAlternative: null,
          completed: false,
          consensusPhase,
        });
      }
    }
  }

  return docs;
};
