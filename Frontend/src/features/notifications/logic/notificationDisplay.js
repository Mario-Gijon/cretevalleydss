export const notificationsMenuLabel = "Notifications";

/**
 * Formatea la fecha de creacion de una notificacion.
 *
 * @param {*} createdAt Fecha de creacion de la notificacion.
 * @returns {string}
 */
export const formatNotificationDate = (createdAt) => {
  const date = new Date(createdAt);

  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} - ${date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })}`;
};
