import { Notification } from "../../../models/Notifications.js";

export const markAllNotificationsAsRead = async ({ userId }) => {
  await Notification.updateMany({ expert: userId, read: false }, { read: true });

  return {
    message: "Notifications marked as read",
  };
};
