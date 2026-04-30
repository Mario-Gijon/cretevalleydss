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
 * Construye los documentos iniciales de Evaluation para estructura directa.
 *
 * @param {Object} params Datos necesarios para construir las evaluaciones.
 * @returns {Array<Object>}
 */
export const buildInitialDirectEvaluations = ({
  issueId,
  experts = [],
  leafCriteria = [],
  alternatives = [],
  consensusPhase = 1,
}) => {
  const issue = toIdString(issueId);
  const expertIds = getEntityIds(experts);
  const criterionIds = getEntityIds(leafCriteria);
  const alternativeIds = getEntityIds(alternatives);

  if (!issue || !expertIds.length || !criterionIds.length || !alternativeIds.length) {
    return [];
  }

  const docs = [];

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
