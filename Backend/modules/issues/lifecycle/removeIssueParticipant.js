import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";

import { mapIssueStageToExitStage } from "./mapIssueStageToExitStage.js";
import { registerUserExit } from "./leaveActiveIssue.js";
import { deleteIssueCascade } from "./deleteIssueCascade.js";
import { cleanupIssueEvaluationsForExpertExit } from "./cleanupIssueEvaluationsForExpertExit.js";
import { resolveIssueExitPhase } from "./resolveIssueExitPhase.js";
import { applyOptionalSession } from "../../../utils/common/mongoose.js";
import { createInternalError } from "../../../utils/common/errors.js";
import {
  createIssueEventOperationMetadata,
  ISSUE_EVENT_TYPES,
  snapshotParticipation,
  writeIssueEvent,
} from "../events/index.js";
import { snapshotIssueLifecycle, writeIssueStageChanged } from "../events/index.js";

const syncActiveIssueStageAfterUserRemoval = async ({
  issue,
  remainingParticipations,
  actorType,
  actorUser,
  occurredAt,
  correlationId,
  session = null,
}) => {
  if (issue.currentStage !== "criteriaWeighting") {
    return false;
  }

  const relevantParticipations = remainingParticipations.filter((participation) =>
    ["accepted", "pending"].includes(participation.invitationStatus)
  );

  const totalParticipants = relevantParticipations.length;
  const totalWeightsDone = relevantParticipations.filter(
    (participation) => participation.weightsCompleted
  ).length;

  if (
    totalParticipants > 0 &&
    totalParticipants === totalWeightsDone &&
    issue.currentStage !== "weightsFinished"
  ) {
    const previousState = snapshotIssueLifecycle(issue);
    issue.currentStage = "weightsFinished";
    await issue.save({ session });
    await writeIssueStageChanged({
      issue,
      previousState,
      actorType,
      actorUser,
      occurredAt,
      correlationId,
      cause: "participantRemovalCompletedCriteriaWeighting",
      session,
    });
    return true;
  }

  return false;
};

export const removeIssueParticipantFromActiveIssue = async ({
  issue,
  participation,
  userId,
  actorType = "system",
  actorUser = null,
  reason,
  correlationId = null,
  occurredAt = null,
  session = null,
}) => {
  const eventMetadata =
    correlationId && occurredAt
      ? { correlationId, occurredAt }
      : createIssueEventOperationMetadata();
  const previousState = snapshotParticipation(participation);
  const [evaluationCleanupResult] = await Promise.all([
    cleanupIssueEvaluationsForExpertExit({
      issue,
      expertId: userId,
      session,
    }),
    applyOptionalSession(
      Notification.deleteMany({
        issue: issue._id,
        expert: userId,
      }),
      session
    ),
    applyOptionalSession(
      Participation.deleteOne({ _id: participation._id }),
      session
    ),
  ]);

  const deletedCount = evaluationCleanupResult?.deletedCount;

  if (typeof deletedCount !== "number") {
    throw createInternalError(
      "IssueEvaluation deleteMany result deletedCount is invalid",
      {
        field: "deletedCount",
        details: {
          issueId: issue._id,
          userId,
          deletedCount,
        },
      }
    );
  }

  const evaluationsDeletedCount = deletedCount;
  const phase = await resolveIssueExitPhase({ issueId: issue._id, session });
  const stage = mapIssueStageToExitStage(issue.currentStage, {
    issueId: issue._id,
  });

  await writeIssueEvent({
    issueId: issue._id,
    eventType: ISSUE_EVENT_TYPES.PARTICIPATION_REMOVED,
    actorType,
    actorUser,
    subjectUser: userId,
    entityType: "participation",
    entityId: participation._id,
    stage,
    phase,
    occurredAt: eventMetadata.occurredAt,
    correlationId: eventMetadata.correlationId,
    reason,
    previousState,
    nextState: null,
    details: {},
    session,
  });

  const remainingParticipations = await applyOptionalSession(
    Participation.find({ issue: issue._id }),
    session
  );

  if (remainingParticipations.length === 0) {
    await deleteIssueCascade({
      issueId: issue._id,
      session,
    });

    return {
      issueDeleted: true,
      issueUpdated: false,
      evaluationsDeletedCount,
    };
  }

  await registerUserExit({
    issueId: issue._id,
    userId,
    phase,
    stage,
    reason,
    session,
  });

  await syncActiveIssueStageAfterUserRemoval({
    issue,
    remainingParticipations,
    actorType,
    actorUser,
    occurredAt: eventMetadata.occurredAt,
    correlationId: eventMetadata.correlationId,
    session,
  });

  return {
    issueDeleted: false,
    issueUpdated: true,
    evaluationsDeletedCount,
  };
};
