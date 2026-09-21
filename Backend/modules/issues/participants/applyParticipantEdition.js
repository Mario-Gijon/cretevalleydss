import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";

import {
  cleanupIssueEvaluationsForExpertExit,
  registerUserEntry,
  registerUserExit,
} from "../lifecycle/index.js";
import { isSingleLeafCriterionCount } from "../shared/participantEntry.js";
import {
  ISSUE_EVENT_TYPES,
  snapshotParticipation,
  writeIssueEvent,
} from "../events/index.js";

import { sameId } from "../../../utils/common/ids.js";
import { createWorkflowNotification } from "../notifications/index.js";

export const addExpertsToActiveIssue = async ({
  issue,
  owner,
  userId,
  actorUserId = userId,
  expertEmails,
  userByEmail,
  leafCriteria,
  currentPhase,
  stageForLog,
  expertWeightsByEmail = null,
  correlationId,
  occurredAt,
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
    const entryReason = isOwnerExpert ? "Added by owner" : "Invited by owner";

    const [participation] = await Participation.create(
      [{
        issue: issue._id,
        expert: expertUser._id,
        invitationStatus: isOwnerExpert ? "accepted" : "pending",
        evaluationCompleted: false,
        weightsCompleted,
        weight: expertWeightsByEmail
          ? expertWeightsByEmail[email]
          : null,
        entryPhase: currentPhase,
        entryStage: stageForLog,
        joinedAt: occurredAt,
      }],
      { session }
    );

    await registerUserEntry({
      issueId: issue._id,
      userId: expertUser._id,
      phase: currentPhase,
      stage: issue.currentStage,
      reason: entryReason,
      session,
    });

    const eventBase = {
      issueId: issue._id,
      actorType: "user",
      actorUser: actorUserId,
      subjectUser: expertUser._id,
      entityType: "participation",
      entityId: participation._id,
      stage: issue.currentStage,
      phase: currentPhase,
      occurredAt,
      correlationId,
      nextState: snapshotParticipation(participation),
      details: { initialIssueCreation: false },
      session,
    };
    await writeIssueEvent({
      ...eventBase,
      eventType: ISSUE_EVENT_TYPES.PARTICIPATION_CREATED,
    });

    if (isOwnerExpert) {
      await writeIssueEvent({
        ...eventBase,
        eventType: ISSUE_EVENT_TYPES.PARTICIPATION_ENTERED,
      });
    }

    if (!isOwnerExpert) {
      const [notification] = await Notification.create(
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

      await writeIssueEvent({
        ...eventBase,
        eventType: ISSUE_EVENT_TYPES.INVITATION_CREATED,
        details: {
          initialIssueCreation: false,
          participationId: String(participation._id),
          notificationId: String(notification._id),
          initialInvitationStatus: participation.invitationStatus,
        },
      });

      invitationEmailsToSend.push(email);
    }
  }

  return invitationEmailsToSend;
};

export const removeExpertsFromActiveIssue = async ({
  issue,
  actorUserId,
  expertEmails,
  userByEmail,
  currentPhase,
  stageForLog,
  correlationId,
  occurredAt,
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
    const previousState = snapshotParticipation(participation);
    const removedByOwner = sameId(actorUserId, issue.ownerId);
    const wasAccepted = participation.invitationStatus === "accepted";

    await cleanupIssueEvaluationsForExpertExit({
      issue,
      expertId: expertUser._id,
      session,
    });

    // The invitation UI derives its response status from Participation. Once
    // that record is gone, retaining its invitation would make it actionable.
    await Notification.deleteMany({
      issue: issue._id,
      expert: expertUser._id,
      type: "invitation",
    }).session(session);
    await Participation.deleteOne({ _id: participation._id }).session(session);

    await createWorkflowNotification({
      recipientId: expertUser._id,
      actorUserId,
      issue,
      type: wasAccepted ? "participantRemoved" : "invitationWithdrawn",
      message: wasAccepted
        ? removedByOwner
          ? "You were removed from this issue by the issue creator."
          : "You were removed from this issue by an administrator."
        : removedByOwner
          ? "Your invitation to this issue was withdrawn by the issue creator."
          : "Your invitation to this issue was withdrawn by an administrator.",
      eventKey: `${wasAccepted ? "participant-removed" : "invitation-withdrawn"}:${participation._id}`,
      session,
    });
    if (!removedByOwner) {
      await createWorkflowNotification({
        recipientId: issue.ownerId,
        actorUserId,
        issue,
        type: wasAccepted ? "participantRemovedByAdministrator" : "invitationWithdrawnByAdministrator",
        message: wasAccepted
          ? `${expertUser.name || "An expert"} was removed from your issue by an administrator.`
          : `${expertUser.name || "An expert"}'s invitation was withdrawn by an administrator.`,
        eventKey: `${wasAccepted ? "participant-removed-owner" : "invitation-withdrawn-owner"}:${participation._id}`,
        session,
      });
    }

    const removalReason = removedByOwner
      ? "Expelled by owner"
      : "Expelled by administrator";

    await writeIssueEvent({
      issueId: issue._id,
      eventType: ISSUE_EVENT_TYPES.PARTICIPATION_REMOVED,
      actorType: "user",
      actorUser: actorUserId,
      subjectUser: expertUser._id,
      entityType: "participation",
      entityId: participation._id,
      stage: issue.currentStage,
      phase: currentPhase,
      occurredAt,
      correlationId,
      reason: removalReason,
      previousState,
      nextState: null,
      details: {},
      session,
    });

    await registerUserExit({
      issueId: issue._id,
      userId: expertUser._id,
      phase: currentPhase,
      stage: stageForLog,
      reason: removalReason,
      session,
    });
  }
};
