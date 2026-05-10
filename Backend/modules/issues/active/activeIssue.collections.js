import { toIdString } from "../../../utils/common/ids.js";
import { buildConsensusHistoryFromDocs } from "../consensus/index.js";

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
  const consensusPhaseCountMap = consensusPhases.reduce(
    (acc, phaseDoc) => {
      const issueId = toIdString(phaseDoc.issue);
      if (!issueId) return acc;

      acc[issueId] = (acc[issueId] || 0) + 1;
      if (!consensusByIssue[issueId]) {
        consensusByIssue[issueId] = [];
      }
      consensusByIssue[issueId].push(phaseDoc);
      return acc;
    },
    {}
  );

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
    consensusPhaseCountMap,
    consensusHistoryByIssue: Object.fromEntries(
      Object.entries(consensusByIssue).map(([issueId, docs]) => [
        issueId,
        buildConsensusHistoryFromDocs(docs),
      ])
    ),
  };
};
