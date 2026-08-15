import { toIdString } from "../../../utils/common/ids.js";
import { ISSUE_EVENT_TYPES } from "./issueEventTypes.js";
import { snapshotParticipation } from "./participationSnapshot.js";
import { writeIssueEvent } from "./issueEventWriter.js";

const serializeDate = (value) =>
  value instanceof Date && !Number.isNaN(value.getTime())
    ? value.toISOString()
    : null;

export const snapshotIssueLifecycle = (issue) => ({
  active: issue?.active === true,
  currentStage: issue?.currentStage ?? null,
  consensusPhase:
    Number.isInteger(issue?.consensusPhase) && issue.consensusPhase >= 0
      ? issue.consensusPhase
      : null,
  isConsensus: issue?.isConsensus === true,
  simulateConsensus: issue?.simulateConsensus === true,
  consensusThreshold:
    typeof issue?.consensusThreshold === "number" && Number.isFinite(issue.consensusThreshold)
      ? issue.consensusThreshold
      : null,
  consensusMaxPhases:
    Number.isInteger(issue?.consensusMaxPhases) && issue.consensusMaxPhases > 0
      ? issue.consensusMaxPhases
      : null,
  finishedAt: serializeDate(issue?.finishedAt),
});

export const writeParticipationCompletionChanged = async ({
  issue,
  participation,
  previousState,
  actorType,
  actorUser = null,
  occurredAt,
  correlationId,
  cause,
  changedFields,
  session = null,
}) => {
  if (!Array.isArray(changedFields) || changedFields.length === 0) return null;

  return writeIssueEvent({
    issueId: issue._id,
    eventType: ISSUE_EVENT_TYPES.PARTICIPATION_COMPLETION_CHANGED,
    actorType,
    actorUser,
    subjectUser: participation.expert,
    entityType: "participation",
    entityId: participation._id,
    stage: issue.currentStage,
    phase: issue.consensusPhase,
    occurredAt,
    correlationId,
    previousState,
    nextState: snapshotParticipation(participation),
    details: { cause, changedFields },
    session,
  });
};

export const writeIssueStageChanged = async ({
  issue,
  previousState,
  actorType,
  actorUser = null,
  occurredAt,
  correlationId,
  cause,
  session = null,
}) => {
  const nextState = snapshotIssueLifecycle(issue);
  if (previousState?.currentStage === nextState.currentStage) return null;

  return writeIssueEvent({
    issueId: issue._id,
    eventType: ISSUE_EVENT_TYPES.ISSUE_STAGE_CHANGED,
    actorType,
    actorUser,
    stage: issue.currentStage,
    phase: issue.consensusPhase,
    occurredAt,
    correlationId,
    previousState,
    nextState,
    details: {
      previousStage: previousState?.currentStage ?? null,
      nextStage: nextState.currentStage,
      cause,
    },
    session,
  });
};

export const writeCriteriaWeightsChanged = async ({
  issue,
  previousWeightsByCriterionId,
  nextWeightsByCriterionId,
  actorType,
  actorUser = null,
  occurredAt,
  correlationId,
  cause,
  stageResultId = null,
  executionAttemptId = null,
  structureKey = null,
  session = null,
}) => writeIssueEvent({
  issueId: issue._id,
  eventType: ISSUE_EVENT_TYPES.CRITERIA_WEIGHTS_CHANGED,
  actorType,
  actorUser,
  stage: issue.currentStage,
  phase: issue.consensusPhase,
  occurredAt,
  correlationId,
  previousState: { weightsByCriterionId: previousWeightsByCriterionId ?? {} },
  nextState: { weightsByCriterionId: nextWeightsByCriterionId ?? {} },
  details: {
    cause,
    sourceStage: "criteriaWeighting",
    stageResultId: toIdString(stageResultId) || null,
    executionAttemptId: toIdString(executionAttemptId) || null,
    structureKey,
  },
  session,
});

export const writeConsensusEvent = async ({
  issue,
  eventType,
  phase,
  actorUser,
  occurredAt,
  correlationId,
  details,
  previousState = null,
  nextState = null,
  session = null,
}) => writeIssueEvent({
  issueId: issue._id,
  eventType,
  actorType: "user",
  actorUser,
  stage: issue.currentStage,
  phase,
  occurredAt,
  correlationId,
  previousState,
  nextState,
  details,
  session,
});
