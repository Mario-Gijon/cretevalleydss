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
  alternativeStageResults,
}) => {
  const consensusByIssue = {};

  for (const stageResult of alternativeStageResults) {
    const issueId = toIdString(stageResult.issue);
    if (!issueId) continue;

    if (!consensusByIssue[issueId]) {
      consensusByIssue[issueId] = [];
    }

    consensusByIssue[issueId].push(stageResult);
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
          .sort((left, right) => left.consensusPhase - right.consensusPhase)
          .map((stageResult) => ({
            phase: stageResult.consensusPhase,
            computedAt: stageResult.updatedAt || stageResult.createdAt || null,
            consensusLevel: stageResult.consensusMeasure,
            rankedAlternatives: stageResult.rankedAlternatives,
            collectiveEvaluations: stageResult.collectiveEvaluations,
            feedback: stageResult.rawOutput?.feedback,
            recommendations: stageResult.rawOutput?.recommendations,
            modelExecution: stageResult.modelExecution,
          })),
      ])
    ),
  };
};
