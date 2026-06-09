import { createInternalError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { isPlainObject } from "../../../utils/common/objects.js";

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
    if (!issueId) {
      throw createInternalError("IssueStageResult issue id is invalid", {
        field: "issue",
      });
    }

    if (!Number.isInteger(stageResult.consensusPhase) || stageResult.consensusPhase <= 0) {
      throw createInternalError("IssueStageResult consensusPhase must be a positive integer", {
        field: "consensusPhase",
        details: {
          issueId,
        },
      });
    }

    if (
      typeof stageResult.consensusMeasure !== "number" ||
      !Number.isFinite(stageResult.consensusMeasure)
    ) {
      throw createInternalError("IssueStageResult consensusMeasure must be finite", {
        field: "consensusMeasure",
        details: {
          issueId,
          phase: stageResult.consensusPhase,
        },
      });
    }

    if (!Array.isArray(stageResult.rankedAlternatives)) {
      throw createInternalError("IssueStageResult rankedAlternatives must be an array", {
        field: "rankedAlternatives",
        details: {
          issueId,
          phase: stageResult.consensusPhase,
        },
      });
    }

    if (!isPlainObject(stageResult.collectiveEvaluations)) {
      throw createInternalError("IssueStageResult collectiveEvaluations must be an object", {
        field: "collectiveEvaluations",
        details: {
          issueId,
          phase: stageResult.consensusPhase,
        },
      });
    }

    if (!isPlainObject(stageResult.modelExecution)) {
      throw createInternalError("IssueStageResult modelExecution must be an object", {
        field: "modelExecution",
        details: {
          issueId,
          phase: stageResult.consensusPhase,
        },
      });
    }

    if (!isPlainObject(stageResult.rawOutput)) {
      throw createInternalError("IssueStageResult rawOutput must be an object", {
        field: "rawOutput",
        details: {
          issueId,
          phase: stageResult.consensusPhase,
        },
      });
    }

    if (!stageResult.updatedAt && !stageResult.createdAt) {
      throw createInternalError("IssueStageResult computedAt timestamp is missing", {
        field: "updatedAt",
        details: {
          issueId,
          phase: stageResult.consensusPhase,
        },
      });
    }

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
            computedAt: stageResult.updatedAt || stageResult.createdAt,
            consensusLevel: stageResult.consensusMeasure,
            consensusMeasure: stageResult.consensusMeasure,
            rankedAlternatives: stageResult.rankedAlternatives,
            collectiveEvaluations: stageResult.collectiveEvaluations,
            feedback: stageResult.rawOutput.feedback,
            recommendations: stageResult.rawOutput.recommendations,
            modelExecution: stageResult.modelExecution,
          })),
      ])
    ),
  };
};
