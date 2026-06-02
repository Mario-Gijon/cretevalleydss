import { toIdString } from "../../../utils/common/ids.js";
import { buildProgressMeta as buildAlternativeCriteriaMatrixProgressMeta } from "../../decisionEngine/evaluations/structures/alternativeCriteriaMatrix/alternativeCriteriaMatrix.display.js";
import { buildProgressMeta as buildAlternativePairwiseProgressMeta } from "../../decisionEngine/evaluations/structures/alternativePairwiseByCriterion/alternativePairwiseByCriterion.display.js";
import { buildParticipantExpertPayload } from "./adminIssueReadPayloads.js";

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

export const resolveEvaluationProgressStats = async ({
  issue,
  storedEvaluation,
  alternatives = [],
  criteria = [],
}) => {
  const alternativeNames = normalizeAlternativesForProgress(alternatives).map(
    (alternative) => alternative.name
  );
  const normalizedCriteria = normalizeCriteriaForProgress(criteria);

  switch (issue?.alternativeEvaluationStructureKey) {
    case "alternativeCriteriaMatrix":
      return buildAlternativeCriteriaMatrixProgressMeta({
        storedEvaluation,
        alternativeNames,
        criteria: normalizedCriteria,
      }).progress;
    case "alternativePairwiseByCriterion":
      return buildAlternativePairwiseProgressMeta({
        storedEvaluation,
        alternativeNames,
        criterionNames: normalizedCriteria.map((criterion) => criterion.name),
      }).progress;
    default:
      return {
        expectedItems: 0,
        totalItems: 0,
        filledItems: 0,
      };
  }
};

export const resolveExpectedEvaluationCellsPerExpert = async ({
  issue,
  alternatives = [],
  criteria = [],
}) => {
  const progress = await resolveEvaluationProgressStats({
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

    const progress = await resolveEvaluationProgressStats({
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

    const progress = await resolveEvaluationProgressStats({
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
