import { toIdString } from "../../../utils/common/ids.js";

/**
 * Agrupa una colección por issue id.
 *
 * @param {Array<Object>} items Elementos a agrupar.
 * @param {Function} selector Selector del issue id.
 * @returns {Object}
 */
const groupByIssueId = (items, selector) => {
  const grouped = {};

  for (const item of items) {
    const issueId = toIdString(selector(item));
    if (!issueId) continue;

    if (!grouped[issueId]) {
      grouped[issueId] = [];
    }

    grouped[issueId].push(item);
  }

  return grouped;
};

/**
 * Construye mapas auxiliares para la respuesta de activos.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Array<Object>} params.participations Participaciones de los issues visibles.
 * @param {Array<Object>} params.alternatives Alternativas de los issues visibles.
 * @param {Array<Object>} params.criteria Criterios de los issues visibles.
 * @param {Array<Object>} params.consensusPhases Fases de consenso guardadas.
 * @returns {Object}
 */
export const buildActiveIssueCollections = ({
  participations,
  alternatives,
  criteria,
  consensusPhases,
}) => {
  const consensusByIssue = {};

  for (const phaseDoc of consensusPhases) {
    const issueId = toIdString(phaseDoc.issue);
    if (!issueId) continue;

    if (!consensusByIssue[issueId]) {
      consensusByIssue[issueId] = [];
    }

    consensusByIssue[issueId].push(phaseDoc);
  }

  return {
    participationMap: groupByIssueId(
      participations,
      (participation) => participation.issue
    ),
    alternativesMap: groupByIssueId(
      alternatives,
      (alternative) => alternative.issue
    ),
    criteriaMap: groupByIssueId(criteria, (criterion) => criterion.issue),
    consensusHistoryByIssue: Object.fromEntries(
      Object.entries(consensusByIssue).map(([issueId, docs]) => [
        issueId,
        docs
          .sort((left, right) => left.phase - right.phase)
          .map((consensusDoc) => ({
            phase: consensusDoc.phase,
            computedAt: consensusDoc.timestamp,
            consensusLevel: consensusDoc.level,
            rankedAlternatives: consensusDoc.details.rankedAlternatives,
            collectiveEvaluations: consensusDoc.collectiveEvaluations,
            feedback: consensusDoc.details.feedback,
            recommendations: consensusDoc.details.recommendations,
            modelExecution: consensusDoc.details.modelExecution,
          })),
      ])
    ),
  };
};
