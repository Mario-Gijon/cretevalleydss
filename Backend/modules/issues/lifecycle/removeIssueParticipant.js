import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";

import { mapIssueStageToExitStage } from "./mapIssueStageToExitStage.js";
import { registerUserExit } from "./leaveActiveIssue.js";
import { deleteIssueCascade } from "./deleteIssueCascade.js";
import { cleanupIssueEvaluationsForExpertExit } from "./cleanupIssueEvaluationsForExpertExit.js";
import { resolveIssueExitPhase } from "./resolveIssueExitPhase.js";
import { applyOptionalSession } from "../../../utils/common/mongoose.js";
import { createInternalError } from "../../../utils/common/errors.js";

const syncActiveIssueStageAfterUserRemoval = async ({
  issue,
  remainingParticipations,
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
    issue.currentStage = "weightsFinished";
    await issue.save({ session });
    return true;
  }

  return false;
};

export const removeIssueParticipantFromActiveIssue = async ({
  issue,
  participation,
  userId,
  reason,
  session = null,
}) => {
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

  const phase = await resolveIssueExitPhase({ issueId: issue._id, session });

  await registerUserExit({
    issueId: issue._id,
    userId,
    phase,
    stage: mapIssueStageToExitStage(issue.currentStage, {
      issueId: issue._id,
    }),
    reason,
    session,
  });

  await syncActiveIssueStageAfterUserRemoval({
    issue,
    remainingParticipations,
    session,
  });

  return {
    issueDeleted: false,
    issueUpdated: true,
    evaluationsDeletedCount,
  };
};
