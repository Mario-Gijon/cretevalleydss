import { useEffect, useState } from "react";

import { useAuthContext } from "../../../context/auth/auth.context";
import { useIssuesDataContext } from "../../../context/issues/issues.context";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import { markAllNotificationsAsRead, removeNotification } from "../../../services/auth.service";
import { changeInvitationStatus } from "../../../services/issue.service";

/**
 * Gestiona estado y acciones de notificaciones para la UI.
 *
 * @returns {object}
 */
export const useNotificationsPanel = () => {
  const { notifications, setNotifications } = useAuthContext();
  const { fetchActiveIssues } = useIssuesDataContext();
  const { showSnackbarAlert } = useSnackbarAlertContext();

  const [openDrawer, setOpenDrawer] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState(null);

  useEffect(() => {
    const notificationsUnread = notifications.filter((notification) => !notification.read).length;
    setUnreadCount(notificationsUnread);
  }, [notifications]);

  /**
   * Abre el drawer y marca todas las notificaciones como leidas.
   *
   * @returns {Promise<void>}
   */
  const openNotificationsDrawer = async () => {
    setOpenDrawer(true);
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
  };

  /**
   * Cierra el drawer de notificaciones.
   *
   * @returns {void}
   */
  const closeNotificationsDrawer = () => setOpenDrawer(false);

  /**
   * Abre el dialogo de confirmacion para eliminar una notificacion.
   *
   * @param {string} notificationId Id de notificacion.
   * @returns {void}
   */
  const openRemoveDialog = (notificationId) => {
    setSelectedNotificationId(notificationId);
    setOpenDialog(true);
  };

  /**
   * Cierra el dialogo de confirmacion de eliminacion.
   *
   * @returns {void}
   */
  const closeRemoveDialog = () => {
    setSelectedNotificationId(null);
    setOpenDialog(false);
  };

  /**
   * Elimina la notificacion seleccionada.
   *
   * @returns {Promise<void>}
   */
  const removeSelectedNotification = async () => {
    const notificationRemoved = await removeNotification(selectedNotificationId);

    if (notificationRemoved?.success) {
      setNotifications(notifications.filter((notification) => notification._id !== selectedNotificationId));
    } else {
      showSnackbarAlert(notificationRemoved?.message || "Error removing notification", "error");
    }

    setOpenDialog(false);
  };

  /**
   * Gestiona la aceptacion o rechazo de invitaciones desde notificaciones.
   *
   * @param {string} issueId Id del issue asociado.
   * @param {string} action Accion de invitacion.
   * @returns {Promise<void>}
   */
  const handleInvitationAction = async (issueId, action) => {
    if (action !== "accepted" && action !== "declined") return;

    const invitationChanged = await changeInvitationStatus(issueId, action);

    if (invitationChanged.success) {
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) =>
          notification.issueId === issueId
            ? {
                ...notification,
                responseStatus:
                  action === "accepted" ? "Invitation accepted" : "Invitation declined",
              }
            : notification
        )
      );

      if (action === "accepted") {
        fetchActiveIssues();
        showSnackbarAlert(invitationChanged?.message || "Invitation accepted", "success");
      } else {
        showSnackbarAlert(invitationChanged?.message || "Invitation declined", "warning");
      }
    } else {
      showSnackbarAlert(invitationChanged?.message || "Error updating invitation", "error");
    }
  };

  return {
    notifications,
    unreadCount,
    openDrawer,
    openDialog,
    openNotificationsDrawer,
    closeNotificationsDrawer,
    openRemoveDialog,
    closeRemoveDialog,
    removeSelectedNotification,
    handleInvitationAction,
  };
};
