import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";

import { mapIssueStageToExitStage } from "./mapIssueStageToExitStage.js";
import { registerUserExit } from "./leaveActiveIssue.js";
import { deleteIssueCascade } from "./deleteIssueCascade.js";
import { resolveIssueExitPhase } from "./resolveIssueExitPhase.js";
import { applyOptionalSession } from "../../../utils/common/mongoose.js";

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
  const [deleteIssueEvaluationsResult] = await Promise.all([
    applyOptionalSession(
      IssueEvaluation.deleteMany({
        issue: issue._id,
        expert: userId,
      }),
      session
    ),
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

  const evaluationsDeletedCount = deleteIssueEvaluationsResult.deletedCount || 0;

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

  const phase = await resolveIssueExitPhase({
    issueId: issue._id,
    fallbackIfMissing: 1,
    session,
  });

  await registerUserExit({
    issueId: issue._id,
    userId,
    phase,
    stage: mapIssueStageToExitStage(issue.currentStage),
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
