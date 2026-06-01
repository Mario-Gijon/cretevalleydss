import { toIdString } from "../../../utils/common/ids.js";
import { buildParticipantExpertPayload } from "./adminIssueReadPayloads.js";

export const countExpectedEvaluationCellsPerExpert = ({
  alternativesCount,
  leafCriteriaCount,
  alternativeEvaluationStructureKey,
}) => {
  if (!alternativesCount || !leafCriteriaCount) {
    return 0;
  }

  if (
    alternativeEvaluationStructureKey ===
    "alternativePairwiseByCriterion"
  ) {
    return (
      alternativesCount *
      leafCriteriaCount *
      Math.max(alternativesCount - 1, 0)
    );
  }

  return alternativesCount * leafCriteriaCount;
};

export const isFilledValue = (value) =>
  !(value === null || value === undefined || value === "");

export const countPayloadCells = (payload = {}) => {
  if (payload?.cells && typeof payload.cells === "object") {
    return Object.keys(payload.cells).length;
  }

  const comparisonsByCriterion = payload?.comparisonsByCriterion;
  if (comparisonsByCriterion && typeof comparisonsByCriterion === "object") {
    return Object.values(comparisonsByCriterion).reduce(
      (total, criterionComparisons) =>
        total +
        (criterionComparisons && typeof criterionComparisons === "object"
          ? Object.keys(criterionComparisons).length
          : 0),
      0
    );
  }

  return 0;
};

export const countFilledPayloadCells = (payload = {}) => {
  if (payload?.cells && typeof payload.cells === "object") {
    return Object.values(payload.cells).filter((cell) =>
      isFilledValue(cell?.value)
    ).length;
  }

  const comparisonsByCriterion = payload?.comparisonsByCriterion;
  if (comparisonsByCriterion && typeof comparisonsByCriterion === "object") {
    return Object.values(comparisonsByCriterion).reduce(
      (total, criterionComparisons) => {
        if (!criterionComparisons || typeof criterionComparisons !== "object") {
          return total;
        }

        return (
          total +
          Object.values(criterionComparisons).filter((cell) =>
            isFilledValue(cell?.value)
          ).length
        );
      },
      0
    );
  }

  return 0;
};

export const buildIssueEvaluationStatsByExpert = (evaluationDocs = []) => {
  const statsByExpert = new Map();

  for (const evaluationDoc of evaluationDocs) {
    const expertId = toIdString(evaluationDoc.expert);
    const previous = statsByExpert.get(expertId) || {
      totalDocs: 0,
      filledDocs: 0,
      lastEvaluationAt: null,
    };

    const payload = evaluationDoc.payload || {};
    const submittedAt = evaluationDoc.submittedAt || null;

    previous.totalDocs += countPayloadCells(payload);
    previous.filledDocs += countFilledPayloadCells(payload);

    if (
      submittedAt &&
      (!previous.lastEvaluationAt ||
        new Date(submittedAt) > new Date(previous.lastEvaluationAt))
    ) {
      previous.lastEvaluationAt = submittedAt;
    }

    statsByExpert.set(expertId, previous);
  }

  return statsByExpert;
};

export const buildIssueEvaluationStatsByIssue = (evaluationDocs = []) => {
  const statsByIssue = new Map();

  for (const evaluationDoc of evaluationDocs) {
    const issueId = toIdString(evaluationDoc.issue);

    const previous = statsByIssue.get(issueId) || {
      filledCells: 0,
      lastEvaluationAt: null,
    };

    previous.filledCells += countFilledPayloadCells(
      evaluationDoc.payload || {}
    );

    const submittedAt = evaluationDoc.submittedAt || null;

    if (
      submittedAt &&
      (!previous.lastEvaluationAt ||
        new Date(submittedAt) > new Date(previous.lastEvaluationAt))
    ) {
      previous.lastEvaluationAt = submittedAt;
    }

    statsByIssue.set(issueId, previous);
  }

  return statsByIssue;
};

export const buildExpertProgressRow = ({
  expert,
  expertId,
  currentParticipant,
  participation = null,
  exit = null,
  evaluationStats,
  weightDoc = null,
  expectedEvaluationCells,
}) => ({
  expert: buildParticipantExpertPayload(expert, expertId),
  currentParticipant,
  invitationStatus: currentParticipant
    ? participation?.invitationStatus
    : "exited",
  weightsCompleted: currentParticipant
    ? participation?.weightsCompleted
    : weightDoc?.completed,
  evaluationCompleted: currentParticipant
    ? participation?.evaluationCompleted
    : false,
  joinedAt: currentParticipant ? participation?.joinedAt : null,
  entryPhase: currentParticipant ? participation?.entryPhase : null,
  entryStage: currentParticipant ? participation?.entryStage : null,
  exitInfo: exit
    ? {
      hidden: exit.hidden,
      timestamp: exit.timestamp,
      phase: exit.phase,
      stage: exit.stage,
      reason: exit.reason,
    }
    : null,
  progress: {
    expectedEvaluationCells,
    totalEvaluationDocs: evaluationStats.totalDocs,
    filledEvaluationDocs: evaluationStats.filledDocs,
    evaluationProgressPct:
      expectedEvaluationCells > 0
        ? ((evaluationStats.filledDocs || 0) / expectedEvaluationCells) * 100
        : 0,
    lastEvaluationAt: evaluationStats.lastEvaluationAt,
    hasWeightDoc: !!weightDoc,
    weightDocCompleted: weightDoc?.completed,
    weightDocPhase: weightDoc?.consensusPhase,
    weightDocUpdatedAt: weightDoc?.updatedAt,
  },
});
