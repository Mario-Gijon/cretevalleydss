import { Notification } from "../../../models/Notifications.js";
import { sameId, toIdString } from "../../../utils/common/ids.js";

/**
 * Persists one informational workflow notification. `eventKey` identifies a
 * state transition, so retried transactions do not create duplicate alerts.
 */
export const createWorkflowNotification = async ({
  recipientId,
  actorUserId = null,
  issue,
  type,
  message,
  eventKey,
  session = null,
}) => {
  if (!recipientId || (actorUserId && sameId(recipientId, actorUserId))) {
    return null;
  }

  const recipient = toIdString(recipientId);
  const issueId = toIdString(issue?._id || issue);
  if (!recipient || !issueId || !eventKey) return null;

  return Notification.findOneAndUpdate(
    { expert: recipientId, issue: issueId, eventKey },
    {
      $setOnInsert: {
        expert: recipientId,
        issue: issueId,
        type,
        message,
        eventKey,
        read: false,
        requiresAction: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, session }
  );
};

export const clearIssueNotificationsForUser = async ({
  userId,
  issue,
  session = null,
}) => {
  const issueId = toIdString(issue?._id || issue);
  if (!userId || !issueId) return { deletedCount: 0 };

  return Notification.deleteMany({ expert: userId, issue: issueId }).session(session);
};

export const notifyAcceptedExperts = async ({
  issue,
  actorUserId,
  type,
  message,
  eventKey,
  participations,
  session = null,
}) => {
  const recipients = participations.filter(
    (participation) =>
      participation.invitationStatus === "accepted" &&
      !sameId(participation.expert?._id || participation.expert, issue.ownerId)
  );

  await Promise.all(
    recipients.map((participation) =>
      createWorkflowNotification({
        recipientId: participation.expert?._id || participation.expert,
        actorUserId,
        issue,
        type,
        message,
        eventKey,
        session,
      })
    )
  );
};
