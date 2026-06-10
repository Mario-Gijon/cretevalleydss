import { Notification } from "../../../models/Notifications.js";

export const markAllNotificationsAsRead = async ({
  userId,
  session = null,
}) => {
  const updateQuery = Notification.updateMany(
    { expert: userId, read: false },
    { read: true }
  );
  if (session) {
    updateQuery.session(session);
  }
  await updateQuery;

  return {
    message: "Notifications marked as read",
  };
};
