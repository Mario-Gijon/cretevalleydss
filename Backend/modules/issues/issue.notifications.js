// Models
import { Issue } from "../../models/Issues.js";
import { Notification } from "../../models/Notificacions.js";
import { Participation } from "../../models/Participations.js";

// Utils
import {
  createBadRequestError,
  createNotFoundError,
} from "../../utils/common/errors.js";
import { toIdString } from "../../utils/common/ids.js";

/**
 * @typedef {Object} NotificationsPayload
 * @property {Array<Object>} notifications Lista de notificaciones formateadas.
 */

/**
 * Construye el texto de respuesta asociado a una invitación.
 *
 * @param {Object|null} participation Documento de participación.
 * @returns {false | string}
 */
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

/**
 * Da formato a una notificación para el frontend.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.notification Notificación cargada.
 * @param {Map<string, Object>} params.participationByIssueId Participaciones del usuario indexadas por issue.
 * @returns {Object}
 */
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

/**
 * Obtiene las notificaciones del usuario actual con el formato esperado por el frontend.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.userId Id del usuario actual.
 * @returns {Promise<NotificationsPayload>}
 */
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
      .filter(([issueId]) => Boolean(issueId))
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

/**
 * Marca todas las notificaciones del usuario actual como leídas.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.userId Id del usuario actual.
 * @returns {Promise<Object>}
 */
export const markAllNotificationsAsReadFlow = async ({ userId }) => {
  await Notification.updateMany({ expert: userId, read: false }, { read: true });

  return {
    message: "Notifications marked as read",
  };
};

/**
 * Cambia el estado de invitación del usuario actual para un issue.
 *
 * Mantiene la lógica actual:
 * - valida existencia del issue
 * - valida existencia de participación
 * - actualiza invitationStatus
 * - si acepta, reinicia evaluationCompleted
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {string|Object} params.userId Id del usuario actual.
 * @param {"accepted"|"declined"} params.action Nuevo estado de invitación.
 * @param {Object|null} [params.session=null] Sesión de Mongo opcional.
 * @returns {Promise<Object>}
 */
export const changeInvitationStatusFlow = async ({
  issueId,
  userId,
  action,
  session = null,
}) => {
  if (!issueId) {
    throw createBadRequestError("Issue id is required");
  }

  if (action !== "accepted" && action !== "declined") {
    throw createBadRequestError("Invalid invitation action", {
      field: "action",
    });
  }

  const issue = await Issue.findById(issueId)
    .select("_id name")
    .session(session);

  if (!issue) {
    throw createNotFoundError("Issue not found");
  }

  const participation = await Participation.findOne({
    issue: issue._id,
    expert: userId,
  }).session(session);

  if (!participation) {
    throw createNotFoundError(
      "No participation found for the user in this issue"
    );
  }

  participation.invitationStatus = action;

  if (action === "accepted") {
    participation.evaluationCompleted = false;
  }

  await participation.save({ session });

  return {
    message:
      action === "accepted"
        ? `Invitation to issue ${issue.name} accepted`
        : `Invitation to issue ${issue.name} declined`,
  };
};

/**
 * Elimina una notificación del usuario actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.notificationId Id de la notificación.
 * @param {string|Object} params.userId Id del usuario actual.
 * @returns {Promise<Object>}
 */
export const removeNotificationForUserFlow = async ({
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