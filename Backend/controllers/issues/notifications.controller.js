import {
  getNotificationsPayload,
  markAllNotificationsAsRead as markAllNotificationsAsReadUseCase,
  removeNotificationForUser,
  respondToIssueInvitationWorkflow,
} from "../../modules/issues/notifications/index.js";
import { sendSuccess } from "../../utils/common/responses.js";

export const getNotifications = async (req, res) => {
  const result = await getNotificationsPayload({
    userId: req.uid,
  });

  return sendSuccess(res, "Notifications fetched successfully", {
    notifications: result.notifications,
  });
};

export const markAllNotificationsAsRead = async (req, res) => {
  const result = await markAllNotificationsAsReadUseCase({
    userId: req.uid,
  });

  return sendSuccess(res, result.message);
};

export const changeInvitationStatus = async (req, res) => {
  return respondToIssueInvitationWorkflow({
    issueId: req.params.id,
    userId: req.uid,
    action: req.body.action,
    beforeSessionCleanup: (result) => sendSuccess(res, result.message),
  });
};

export const removeNotificationById = async (req, res) => {
  const notificationId = req.params.notificationId;
  const result = await removeNotificationForUser({
    notificationId,
    userId: req.uid,
  });

  return sendSuccess(res, result.message, { notificationId });
};
