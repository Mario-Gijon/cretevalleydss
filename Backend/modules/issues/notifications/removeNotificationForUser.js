import { Notification } from "../../../models/Notifications.js";

import {
  createBadRequestError,
  createNotFoundError,
} from "../../../utils/common/errors.js";

export const removeNotificationForUser = async ({
  notificationId,
  userId,
  session = null,
}) => {
  if (!notificationId) {
    throw createBadRequestError("Notification id is required", {
      field: "notificationId",
    });
  }

  const notificationQuery = Notification.findOne({
    _id: notificationId,
    expert: userId,
  });
  if (session) {
    notificationQuery.session(session);
  }
  const notification = await notificationQuery;

  if (!notification) {
    throw createNotFoundError("Notification not found");
  }

  const deleteQuery = Notification.deleteOne({ _id: notification._id });
  if (session) {
    deleteQuery.session(session);
  }
  await deleteQuery;

  return {
    message: "Notification removed successfully",
  };
};
