import { toIdString } from "../../../utils/common/ids.js";
import { buildParticipantExpertPayload } from "./adminIssueReadPayloads.js";

export const resolveStoredEvaluationStatus = (storedEvaluation) => {
  if (!storedEvaluation) {
    return {
      status: "notSubmitted",
      completed: false,
      submittedAt: null,
      updatedAt: null,
      lastActivityAt: null,
    };
  }

  const completed = storedEvaluation.completed === true;
  const submittedAt = storedEvaluation.submittedAt || null;
  const updatedAt = storedEvaluation.updatedAt || null;

  return {
    status: completed ? "submitted" : "draft",
    completed,
    submittedAt,
    updatedAt,
    lastActivityAt: submittedAt || updatedAt,
  };
};

export const resolveEvaluationProgressStats = async ({
  storedEvaluation,
}) => {
  const statusMeta = resolveStoredEvaluationStatus(storedEvaluation);

  return {
    ...statusMeta,
    expectedItems: 1,
    totalItems: storedEvaluation ? 1 : 0,
    filledItems: statusMeta.completed ? 1 : 0,
  };
};

export const resolveExpectedEvaluationCellsPerExpert = async () => 1;

export const buildIssueEvaluationStatsByExpert = async ({
  evaluationDocs = [],
}) => {
  const statsByExpert = new Map();

  for (const evaluationDoc of evaluationDocs) {
    const expertId = toIdString(evaluationDoc.expert);
    const previous = statsByExpert.get(expertId) || {
      totalDocs: 0,
      submittedDocs: 0,
      draftDocs: 0,
      lastEvaluationAt: null,
      latestStatus: "notSubmitted",
      latestCompleted: false,
      latestSubmittedAt: null,
      latestUpdatedAt: null,
    };

    const progress = await resolveEvaluationProgressStats({
      storedEvaluation: evaluationDoc,
    });
    const lastActivityAt = progress.lastActivityAt;

    previous.totalDocs += progress.totalItems;
    previous.submittedDocs += progress.completed ? 1 : 0;
    previous.draftDocs += progress.status === "draft" ? 1 : 0;

    if (
      lastActivityAt &&
      (!previous.lastEvaluationAt ||
        new Date(lastActivityAt) > new Date(previous.lastEvaluationAt))
    ) {
      previous.lastEvaluationAt = lastActivityAt;
      previous.latestStatus = progress.status;
      previous.latestCompleted = progress.completed;
      previous.latestSubmittedAt = progress.submittedAt;
      previous.latestUpdatedAt = progress.updatedAt;
    }

    statsByExpert.set(expertId, previous);
  }

  return statsByExpert;
};

export const buildIssueEvaluationStatsByIssue = async ({
  evaluationDocs = [],
  issuesById = new Map(),
}) => {
  const statsByIssue = new Map();

  for (const evaluationDoc of evaluationDocs) {
    const issueId = toIdString(evaluationDoc.issue);
    const issue = issuesById.get(issueId);

    if (!issue) {
      continue;
    }

    const previous = statsByIssue.get(issueId) || {
      totalDocs: 0,
      submittedDocs: 0,
      draftDocs: 0,
      lastEvaluationAt: null,
    };

    const progress = await resolveEvaluationProgressStats({
      storedEvaluation: evaluationDoc,
    });
    const lastActivityAt = progress.lastActivityAt;
    previous.totalDocs += progress.totalItems;
    previous.submittedDocs += progress.completed ? 1 : 0;
    previous.draftDocs += progress.status === "draft" ? 1 : 0;

    if (
      lastActivityAt &&
      (!previous.lastEvaluationAt ||
        new Date(lastActivityAt) > new Date(previous.lastEvaluationAt))
    ) {
      previous.lastEvaluationAt = lastActivityAt;
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
    status: evaluationStats.latestStatus || "notSubmitted",
    completed: evaluationStats.latestCompleted === true,
    expectedEvaluationCells,
    totalEvaluationDocs: evaluationStats.totalDocs,
    submittedEvaluationDocs: evaluationStats.submittedDocs || 0,
    draftEvaluationDocs: evaluationStats.draftDocs || 0,
    filledEvaluationDocs:
      evaluationStats.latestCompleted === true ? 1 : 0,
    evaluationProgressPct: evaluationStats.latestCompleted === true ? 100 : 0,
    lastEvaluationAt: evaluationStats.lastEvaluationAt,
    submittedAt: evaluationStats.latestSubmittedAt || null,
    updatedAt: evaluationStats.latestUpdatedAt || null,
    hasWeightDoc: !!weightDoc,
    weightDocCompleted: weightDoc?.completed,
    weightDocPhase: weightDoc?.consensusPhase,
    weightDocUpdatedAt: weightDoc?.updatedAt,
  },
});
