import { Notification } from "../../../models/Notifications.js";

import {
  createBadRequestError,
  createNotFoundError,
} from "../../../utils/common/errors.js";

export const removeNotificationForUser = async ({
  notificationId,
  userId,
}) => {
  if (!notificationId) {
    throw createBadRequestError("Notification id is required", {
      field: "notificationId",
    });
  }

  const notification = await Notification.findOne({
    _id: notificationId,
    expert: userId,
  });

  if (!notification) {
    throw createNotFoundError("Notification not found");
  }

  await Notification.deleteOne({ _id: notification._id });

  return {
    message: "Notification removed successfully",
  };
};
