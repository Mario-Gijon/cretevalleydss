import { toIdString } from "../../../utils/common/ids.js";
import { getEvaluationStructureOrThrow } from "../../decisionEngine/evaluations/index.js";
import { buildParticipantExpertPayload } from "./adminIssueReadPayloads.js";

const toProgressStats = (displayPayload) => {
  const progress = displayPayload?.meta?.progress;

  const expectedItems = Number(progress?.expectedItems);
  const totalItems = Number(progress?.totalItems);
  const filledItems = Number(progress?.filledItems);

  return {
    expectedItems: Number.isFinite(expectedItems) ? expectedItems : 0,
    totalItems: Number.isFinite(totalItems) ? totalItems : 0,
    filledItems: Number.isFinite(filledItems) ? filledItems : 0,
  };
};

const normalizeAlternativesForProgress = (alternatives = []) =>
  alternatives.map((alternative, index) => ({
    name: String(
      alternative?.name ?? alternative?.id ?? alternative?._id ?? `alternative_${index + 1}`
    ),
  }));

const normalizeCriteriaForProgress = (criteria = []) =>
  criteria.map((criterion, index) => ({
    name: String(
      criterion?.name ?? criterion?.id ?? criterion?._id ?? `criterion_${index + 1}`
    ),
    expressionDomain: criterion?.expressionDomain || null,
  }));

export const buildPlaceholderAlternatives = (count = 0) =>
  Array.from({ length: Math.max(Number(count) || 0, 0) }, (_, index) => ({
    name: `alternative_${index + 1}`,
  }));

export const buildPlaceholderCriteria = (count = 0) =>
  Array.from({ length: Math.max(Number(count) || 0, 0) }, (_, index) => ({
    name: `criterion_${index + 1}`,
    expressionDomain: null,
  }));

const buildStructureProgressMeta = async ({
  issue,
  storedEvaluation,
  alternatives = [],
  criteria = [],
}) => {
  const structure = getEvaluationStructureOrThrow(
    issue.alternativeEvaluationStructureKey
  );

  const displayPayload = await structure.get({
    storedEvaluation,
    issue,
    alternatives: normalizeAlternativesForProgress(alternatives),
    criteria: normalizeCriteriaForProgress(criteria),
    includeMeta: true,
  });

  return toProgressStats(displayPayload);
};

export const resolveExpectedEvaluationCellsPerExpert = async ({
  issue,
  alternatives = [],
  criteria = [],
}) => {
  const progress = await buildStructureProgressMeta({
    issue,
    storedEvaluation: null,
    alternatives,
    criteria,
  });

  return progress.expectedItems;
};

export const buildIssueEvaluationStatsByExpert = async ({
  issue,
  evaluationDocs = [],
  alternatives = [],
  criteria = [],
}) => {
  const statsByExpert = new Map();

  for (const evaluationDoc of evaluationDocs) {
    const expertId = toIdString(evaluationDoc.expert);
    const previous = statsByExpert.get(expertId) || {
      totalDocs: 0,
      filledDocs: 0,
      lastEvaluationAt: null,
    };

    const progress = await buildStructureProgressMeta({
      issue,
      storedEvaluation: evaluationDoc,
      alternatives,
      criteria,
    });
    const submittedAt = evaluationDoc.submittedAt || null;

    previous.totalDocs += progress.totalItems;
    previous.filledDocs += progress.filledItems;

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

export const buildIssueEvaluationStatsByIssue = async ({
  evaluationDocs = [],
  issuesById = new Map(),
  alternativesByIssueId = new Map(),
  criteriaByIssueId = new Map(),
}) => {
  const statsByIssue = new Map();

  for (const evaluationDoc of evaluationDocs) {
    const issueId = toIdString(evaluationDoc.issue);
    const issue = issuesById.get(issueId);

    if (!issue) {
      continue;
    }

    const previous = statsByIssue.get(issueId) || {
      filledCells: 0,
      lastEvaluationAt: null,
    };

    const progress = await buildStructureProgressMeta({
      issue,
      storedEvaluation: evaluationDoc,
      alternatives: alternativesByIssueId.get(issueId) || [],
      criteria: criteriaByIssueId.get(issueId) || [],
    });

    previous.filledCells += progress.filledItems;

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
