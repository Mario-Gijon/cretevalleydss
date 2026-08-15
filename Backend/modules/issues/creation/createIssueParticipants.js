import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";
import {
  ISSUE_EVENT_TYPES,
  snapshotParticipation,
  writeIssueEvent,
} from "../events/index.js";
import { sameId, toIdString } from "../../../utils/common/ids.js";

export const createIssueParticipationsAndNotifications = async ({
  issue,
  input,
  expertByEmail,
  owner,
  ownerEmail,
  isCriteriaWeightingRequired,
  normalizedExpertWeightsByEmail,
  correlationId,
  occurredAt,
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
      joinedAt: occurredAt,
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

  const createdParticipations = participationDocs.length > 0
    ? await Participation.insertMany(participationDocs, {
      session,
      ordered: true,
    })
    : [];

  const createdNotifications = notificationDocs.length > 0
    ? await Notification.insertMany(notificationDocs, {
      session,
      ordered: true,
    })
    : [];

  const notificationByExpertId = new Map(
    createdNotifications.map((notification) => [
      toIdString(notification.expert),
      notification,
    ])
  );
  const stage = issue.currentStage;

  for (const participation of createdParticipations) {
    const isOwnerExpert = sameId(participation.expert, issue.ownerId);
    const nextState = snapshotParticipation(participation);
    const baseEvent = {
      issueId: issue._id,
      actorType: "user",
      actorUser: owner._id,
      subjectUser: participation.expert,
      entityType: "participation",
      entityId: participation._id,
      stage,
      phase: issue.consensusPhase,
      occurredAt,
      correlationId,
      nextState,
      details: { initialIssueCreation: true },
      session,
    };

    await writeIssueEvent({
      ...baseEvent,
      eventType: ISSUE_EVENT_TYPES.PARTICIPATION_CREATED,
    });

    if (isOwnerExpert) {
      await writeIssueEvent({
        ...baseEvent,
        eventType: ISSUE_EVENT_TYPES.PARTICIPATION_ENTERED,
      });
      continue;
    }

    const notification = notificationByExpertId.get(toIdString(participation.expert));
    await writeIssueEvent({
      ...baseEvent,
      eventType: ISSUE_EVENT_TYPES.INVITATION_CREATED,
      details: {
        initialIssueCreation: true,
        participationId: toIdString(participation._id),
        notificationId: toIdString(notification?._id) || null,
        initialInvitationStatus: participation.invitationStatus,
      },
    });
  }

  return {
    emailsToSend,
  };
};
