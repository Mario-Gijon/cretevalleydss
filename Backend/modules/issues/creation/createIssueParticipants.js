import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";

export const createIssueParticipationsAndNotifications = async ({
  issue,
  input,
  expertByEmail,
  owner,
  ownerEmail,
  isCriteriaWeightingRequired,
  normalizedExpertWeightsByEmail,
  session,
}) => {
  const participationDocs = [];
  const notificationDocs = [];
  const emailsToSend = [];

  for (const email of input.uniqueExpertEmails) {
    const expertUser = expertByEmail.get(email);
    const isOwnerExpert = email === ownerEmail;

    participationDocs.push({
      issue: issue._id,
      expert: expertUser._id,
      invitationStatus: isOwnerExpert ? "accepted" : "pending",
      evaluationCompleted: false,
      weightsCompleted: !isCriteriaWeightingRequired,
      weight: normalizedExpertWeightsByEmail
        ? normalizedExpertWeightsByEmail[email]
        : null,
      entryPhase: null,
      entryStage: null,
      joinedAt: new Date(),
    });

    if (!isOwnerExpert) {
      notificationDocs.push({
        expert: expertUser._id,
        issue: issue._id,
        type: "invitation",
        message: `You have been invited by ${owner.name} to participate in ${input.issueName}.`,
        read: false,
        requiresAction: true,
      });

      emailsToSend.push({
        expertEmail: email,
        issueName: input.issueName,
        issueDescription: input.issueDescription,
        ownerEmail,
      });
    }
  }

  if (participationDocs.length > 0) {
    await Participation.insertMany(participationDocs, {
      session,
      ordered: true,
    });
  }

  if (notificationDocs.length > 0) {
    await Notification.insertMany(notificationDocs, {
      session,
      ordered: true,
    });
  }

  return {
    emailsToSend,
  };
};
