import { Notification } from "../../../models/Notificacions.js";
import { Participation } from "../../../models/Participations.js";

export const createIssueParticipationsAndNotifications = async ({
  issue,
  input,
  expertByEmail,
  admin,
  adminEmail,
  isCriteriaWeightingRequired,
  session,
}) => {
  const participationDocs = [];
  const notificationDocs = [];
  const emailsToSend = [];

  for (const email of input.uniqueExpertEmails) {
    const expertUser = expertByEmail.get(email);
    const isAdminExpert = email === adminEmail;

    participationDocs.push({
      issue: issue._id,
      expert: expertUser._id,
      invitationStatus: isAdminExpert ? "accepted" : "pending",
      evaluationCompleted: false,
      weightsCompleted: !isCriteriaWeightingRequired,
      entryPhase: null,
      entryStage: null,
      joinedAt: new Date(),
    });

    if (!isAdminExpert) {
      notificationDocs.push({
        expert: expertUser._id,
        issue: issue._id,
        type: "invitation",
        message: `You have been invited by ${admin.name} to participate in ${input.issueName}.`,
        read: false,
        requiresAction: true,
      });

      emailsToSend.push({
        expertEmail: email,
        issueName: input.issueName,
        issueDescription: input.issueDescription,
        adminEmail,
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
