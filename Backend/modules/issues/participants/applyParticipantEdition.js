import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";

import {
  cleanupIssueEvaluationsForExpertExit,
  registerUserExit,
} from "../lifecycle/index.js";
import { isSingleLeafCriterionCount } from "../shared/participantEntry.js";

import { sameId } from "../../../utils/common/ids.js";

export const addExpertsToActiveIssue = async ({
  issue,
  owner,
  userId,
  expertEmails,
  userByEmail,
  leafCriteria,
  currentPhase,
  stageForLog,
  session = null,
}) => {
  const invitationEmailsToSend = [];

  for (const email of expertEmails) {
    const expertUser = userByEmail.get(email);
    if (!expertUser) continue;

    const existingParticipation = await Participation.findOne({
      issue: issue._id,
      expert: expertUser._id,
    }).session(session);

    if (existingParticipation) continue;

    const isOwnerExpert = sameId(expertUser._id, userId);
    const weightsCompleted = isSingleLeafCriterionCount(leafCriteria.length);

    await Participation.create(
      [{
        issue: issue._id,
        expert: expertUser._id,
        invitationStatus: isOwnerExpert ? "accepted" : "pending",
        evaluationCompleted: false,
        weightsCompleted,
        entryPhase: currentPhase,
        entryStage: stageForLog,
        joinedAt: new Date(),
      }],
      { session }
    );

    if (!isOwnerExpert) {
      await Notification.create(
        [{
          expert: expertUser._id,
          issue: issue._id,
          type: "invitation",
          message: `You have been invited by ${owner.name} to participate in ${issue.name}.`,
          read: false,
          requiresAction: true,
        }],
        { session }
      );

      invitationEmailsToSend.push(email);
    }
  }

  return invitationEmailsToSend;
};

export const removeExpertsFromActiveIssue = async ({
  issue,
  expertEmails,
  userByEmail,
  currentPhase,
  stageForLog,
  session = null,
}) => {
  for (const email of expertEmails) {
    const expertUser = userByEmail.get(email);
    if (!expertUser) continue;

    if (sameId(expertUser._id, issue.ownerId)) continue;

    const participation = await Participation.findOne({
      issue: issue._id,
      expert: expertUser._id,
    }).session(session);

    if (!participation) continue;

    await cleanupIssueEvaluationsForExpertExit({
      issue,
      expertId: expertUser._id,
      session,
    });

    await Participation.deleteOne({ _id: participation._id }).session(session);

    await registerUserExit({
      issueId: issue._id,
      userId: expertUser._id,
      phase: currentPhase,
      stage: stageForLog,
      reason: "Expelled by owner",
      session,
    });
  }
};
