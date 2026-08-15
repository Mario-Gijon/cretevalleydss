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
      stage: stageForLog,
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
      stage: stageForLog,
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

    await cleanupIssueEvaluationsForExpertExit({
      issue,
      expertId: expertUser._id,
      session,
    });

    await Participation.deleteOne({ _id: participation._id }).session(session);

    await writeIssueEvent({
      issueId: issue._id,
      eventType: ISSUE_EVENT_TYPES.PARTICIPATION_REMOVED,
      actorType: "user",
      actorUser: actorUserId,
      subjectUser: expertUser._id,
      entityType: "participation",
      entityId: participation._id,
      stage: stageForLog,
      phase: currentPhase,
      occurredAt,
      correlationId,
      reason: "Expelled by owner",
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
      reason: "Expelled by owner",
      session,
    });
  }
};
