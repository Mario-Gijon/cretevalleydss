import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";

import {
  cleanupExpertDraftsOnExit,
  registerUserExit,
} from "../lifecycle/index.js";
import { isSingleLeafCriterionCount } from "../shared/participantEntry.js";

import { sameId } from "../../../utils/common/ids.js";

export const addExpertsToActiveIssue = async ({
  issue,
  admin,
  userId,
  expertEmails,
  userByEmail,
  leafCriteria,
  currentPhase,
  stageForLog,
}) => {
  const invitationEmailsToSend = [];

  for (const email of expertEmails) {
    const expertUser = userByEmail.get(email);
    if (!expertUser) continue;

    const existingParticipation = await Participation.findOne({
      issue: issue._id,
      expert: expertUser._id,
    });

    if (existingParticipation) continue;

    const isAdminExpert = sameId(expertUser._id, userId);
    const weightsCompleted = isSingleLeafCriterionCount(leafCriteria.length);

    await Participation.create({
      issue: issue._id,
      expert: expertUser._id,
      invitationStatus: isAdminExpert ? "accepted" : "pending",
      evaluationCompleted: false,
      weightsCompleted,
      entryPhase: currentPhase,
      entryStage: stageForLog,
      joinedAt: new Date(),
    });

    if (!isAdminExpert) {
      await Notification.create({
        expert: expertUser._id,
        issue: issue._id,
        type: "invitation",
        message: `You have been invited by ${
          admin?.name || admin?.email || "admin"
        } to participate in ${issue.name}.`,
        read: false,
        requiresAction: true,
      });

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
}) => {
  for (const email of expertEmails) {
    const expertUser = userByEmail.get(email);
    if (!expertUser) continue;

    if (sameId(expertUser._id, issue.admin)) continue;

    const participation = await Participation.findOne({
      issue: issue._id,
      expert: expertUser._id,
    });

    if (!participation) continue;

    await cleanupExpertDraftsOnExit({
      issueId: issue._id,
      expertId: expertUser._id,
    });

    await Participation.deleteOne({ _id: participation._id });

    await registerUserExit({
      issueId: issue._id,
      userId: expertUser._id,
      phase: currentPhase,
      stage: stageForLog,
      reason: "Expelled by admin",
    });
  }
};
