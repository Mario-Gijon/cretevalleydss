import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";

import { toIdString } from "../../../utils/common/ids.js";

const getNotificationResponseStatus = (participation) => {
  if (!participation) {
    return false;
  }

  if (participation.invitationStatus === "accepted") {
    return "Invitation accepted";
  }

  if (participation.invitationStatus === "declined") {
    return "Invitation declined";
  }

  return false;
};

const buildNotificationItem = ({ notification, participationByIssueId }) => {
  const issueId = toIdString(notification.issue?._id);
  const participation = issueId ? participationByIssueId.get(issueId) : null;

  return {
    _id: notification._id,
    header:
      notification.type === "invitation"
        ? "Invitation"
        : notification.issue?.name,
    message: notification.message,
    userEmail: notification.expert
      ? notification.expert.email
      : "Usuario eliminado",
    issueName: notification.issue
      ? notification.issue.name
      : "Problema eliminado",
    issueId: issueId || null,
    requiresAction: notification.requiresAction,
    read: notification.read ?? false,
    createdAt: notification.createdAt,
    responseStatus: getNotificationResponseStatus(participation),
  };
};

export const getNotificationsPayload = async ({ userId }) => {
  const [notifications, participations] = await Promise.all([
    Notification.find({ expert: userId })
      .sort({ createdAt: -1 })
      .populate("expert", "email")
      .populate("issue", "name")
      .lean(),
    Participation.find({ expert: userId }).lean(),
  ]);

  const participationByIssueId = new Map(
    participations
      .map((participation) => [toIdString(participation.issue), participation])
      .filter(([issueId]) => issueId)
  );

  return {
    notifications: notifications.map((notification) =>
      buildNotificationItem({
        notification,
        participationByIssueId,
      })
    ),
  };
};
