import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";

import { createInternalError } from "../../../utils/common/errors.js";
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

const getNonEmptyString = ({ value, message, field, details = null }) => {
  if (typeof value !== "string" || value.trim() === "") {
    throw createInternalError(message, {
      field,
      details,
    });
  }

  return value.trim();
};

const validateNotification = (notification) => {
  const notificationId = toIdString(notification?._id);

  if (!notificationId) {
    throw createInternalError("Notification id is invalid", {
      field: "notifications._id",
    });
  }

  if (!notification.expert || typeof notification.expert !== "object") {
    throw createInternalError("Notification expert must be populated", {
      field: "notifications.expert",
      details: {
        notificationId,
      },
    });
  }

  const userEmail = getNonEmptyString({
    value: notification.expert.email,
    message: "Notification expert email is invalid",
    field: "notifications.expert.email",
    details: {
      notificationId,
    },
  });

  if (!notification.issue || typeof notification.issue !== "object") {
    throw createInternalError("Notification issue must be populated", {
      field: "notifications.issue",
      details: {
        notificationId,
      },
    });
  }

  const issueName = getNonEmptyString({
    value: notification.issue.name,
    message: "Notification issue name is invalid",
    field: "notifications.issue.name",
    details: {
      notificationId,
    },
  });

  const issueId = toIdString(notification.issue._id);

  if (!issueId) {
    throw createInternalError("Notification issue id is invalid", {
      field: "notifications.issue._id",
      details: {
        notificationId,
      },
    });
  }

  return {
    notificationId,
    userEmail,
    issueName,
    issueId,
    type: notification.type,
    message: notification.message,
    requiresAction: notification.requiresAction,
    read: notification.read,
    createdAt: notification.createdAt,
  };
};

const buildNotificationItem = ({ notification, participationByIssueId }) => {
  const {
    notificationId,
    userEmail,
    issueName,
    issueId,
    type,
    message,
    requiresAction,
    read,
    createdAt,
  } = validateNotification(notification);
  const participation = participationByIssueId.get(issueId) ?? null;

  return {
    _id: notificationId,
    header: type === "invitation" ? "Invitation" : issueName,
    message,
    userEmail,
    issueName,
    issueId,
    requiresAction,
    read,
    createdAt,
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

  const participationByIssueId = new Map();

  for (const participation of participations) {
    const issueId = toIdString(participation.issue);

    if (!issueId) {
      throw createInternalError(
        "Participation issue id is invalid while loading notifications",
        {
          field: "participations.issue",
          details: {
            participationId: toIdString(participation._id) || null,
          },
        }
      );
    }

    participationByIssueId.set(issueId, participation);
  }

  return {
    notifications: notifications.map((notification) =>
      buildNotificationItem({
        notification,
        participationByIssueId,
      })
    ),
  };
};
