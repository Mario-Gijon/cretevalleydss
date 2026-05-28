import { toIdString } from "../../../utils/common/ids.js";

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
