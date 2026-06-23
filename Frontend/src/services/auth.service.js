import {
  authFetch,
  clearAccessToken,
  refreshAccessToken,
  setAccessToken,
} from "../utils/authFetch";
import {
  API,
  buildNetworkErrorResponse,
  normalizeApiResponse,
  jsonRequest,
  safeJson,
} from "./httpRequest.service.js";

export const EmptyAuthState = {
  university: "",
  name: "",
  email: "",
  accountCreation: "",
  role: "user",
  isAdmin: false,
};

/**
 * Ejecuta una petición pública y devuelve el payload JSON.
 *
 * @param {string} path Ruta relativa a la API.
 * @param {object} options Opciones de fetch.
 * @param {string} errorPrefix Prefijo del log de error.
 * @returns {Promise<object|false>}
 */
const requestPublicPayload = async (path, options, errorPrefix) => {
  try {
    const response = await fetch(`${API}${path}`, options);
    return await safeJson(response);
  } catch (error) {
    console.error(errorPrefix, error);
    return false;
  }
};

/**
 * Ejecuta una petición autenticada y devuelve el payload JSON.
 *
 * @param {string} path Ruta relativa a la API.
 * @param {object} options Opciones de fetch.
 * @param {string} errorPrefix Prefijo del log de error.
 * @returns {Promise<object|false>}
 */
const requestAuthPayload = async (path, options, errorPrefix) => {
  try {
    const response = await authFetch(`${API}${path}`, options);
    return await safeJson(response);
  } catch (error) {
    console.error(errorPrefix, error);
    return false;
  }
};

/**
 * Ejecuta una petición autenticada y, ante error de red, devuelve
 * una respuesta normalizada en lugar de `false`.
 *
 * @param {string} path Ruta relativa a la API.
 * @param {object} options Opciones de fetch.
 * @param {string} errorPrefix Prefijo del log de error.
 * @param {string} fallbackMessage Mensaje para error de red.
 * @returns {Promise<object>}
 */
const requestAuthPayloadOrNetworkError = async (
  path,
  options,
  errorPrefix,
  fallbackMessage
) => {
  try {
    const response = await authFetch(`${API}${path}`, options);
    return await safeJson(response);
  } catch (error) {
    console.error(errorPrefix, error);
    return buildNetworkErrorResponse(fallbackMessage);
  }
};

/**
 * Recupera la sesión del usuario al arrancar la aplicación usando
 * la cookie de refresh token.
 *
 * @returns {Promise<boolean>}
 */
export const bootstrapSession = async () => {
  const token = await refreshAccessToken();
  return !!token;
};

/**
 * Obtiene el perfil del usuario autenticado.
 *
 * @returns {Promise<object|false>}
 */
export const fetchProtectedData = async () => {
  const data = await requestAuthPayload(
    "/auth/me",
    { method: "GET" },
    "Error fetching authenticated user:"
  );

  return data?.success ? data : false;
};

export const fetchProtectedDataForBootstrap = async () => {
  try {
    const response = await authFetch(`${API}/auth/me`, { method: "GET" });
    const payload = await safeJson(response);

    return normalizeApiResponse(
      payload,
      response,
      "Error fetching authenticated user."
    );
  } catch (error) {
    console.error("Error fetching authenticated user:", error);
    return buildNetworkErrorResponse("Error fetching authenticated user.");
  }
};

/**
 * Registra un nuevo usuario.
 *
 * @param {object} formValues Datos del formulario.
 * @returns {Promise<object|false>}
 */
export const signup = async (formValues) =>
  requestPublicPayload(
    "/auth/signup",
    jsonRequest("POST", formValues),
    "Error during signup:"
  );

/**
 * Inicia sesión y guarda el access token en memoria.
 *
 * @param {object} formValues Datos del formulario.
 * @returns {Promise<object|false>}
 */
export const login = async (formValues) => {
  const data = await requestPublicPayload(
    "/auth/login",
    {
      ...jsonRequest("POST", formValues),
      credentials: "include",
    },
    "Error during login:"
  );

  if (data?.success && data?.data?.token) {
    setAccessToken(data.data.token);
  } else if (data?.success) {
    await refreshAccessToken();
  }

  return data;
};

/**
 * Cierra la sesión actual y limpia el access token en memoria.
 *
 * @returns {Promise<object|false>}
 */
export const logout = async () => {
  try {
    const response = await fetch(`${API}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    const data = await safeJson(response);

    clearAccessToken();

    return data;
  } catch (error) {
    console.error("Error during logout:", error);
    return false;
  }
};

/**
 * Elimina la cuenta del usuario autenticado.
 *
 * @returns {Promise<object|false>}
 */
export const deleteAccount = async () => {
  const data = await requestAuthPayload(
    "/auth/me",
    { method: "DELETE" },
    "Error deleting account:"
  );

  if (data?.success) {
    clearAccessToken();
  }

  return data;
};

/**
 * Actualiza la contraseña del usuario autenticado.
 *
 * @param {string} newPassword Nueva contraseña.
 * @param {string} repeatNewPassword Confirmación de contraseña.
 * @returns {Promise<object>}
 */
export const updatePassword = async (newPassword, repeatNewPassword) =>
  requestAuthPayloadOrNetworkError(
    "/auth/me/password",
    jsonRequest("PUT", { newPassword, repeatNewPassword }),
    "Error updating password:",
    "Error updating password."
  );

/**
 * Actualiza la universidad del usuario autenticado.
 *
 * @param {string} newUniversity Nueva universidad.
 * @returns {Promise<object>}
 */
export const modifyUniversity = async (newUniversity) =>
  requestAuthPayloadOrNetworkError(
    "/auth/me/university",
    jsonRequest("PATCH", { newUniversity }),
    "Error updating university:",
    "Error updating university."
  );

/**
 * Actualiza el nombre del usuario autenticado.
 *
 * @param {string} newName Nuevo nombre.
 * @returns {Promise<object>}
 */
export const modifyName = async (newName) =>
  requestAuthPayloadOrNetworkError(
    "/auth/me/name",
    jsonRequest("PATCH", { newName }),
    "Error updating name:",
    "Error updating name."
  );

/**
 * Solicita el cambio de email del usuario autenticado.
 *
 * @param {string} newEmail Nuevo email.
 * @returns {Promise<object>}
 */
export const modifyEmail = async (newEmail) =>
  requestAuthPayloadOrNetworkError(
    "/auth/me/email",
    jsonRequest("PATCH", { newEmail }),
    "Error updating email:",
    "Error updating email."
  );

/**
 * Obtiene las notificaciones del usuario actual.
 *
 * @returns {Promise<object|false>}
 */
export const getNotifications = async () =>
  requestAuthPayload(
    "/issues/notifications",
    { method: "GET" },
    "Error fetching notifications:"
  );

/**
 * Marca como leídas todas las notificaciones del usuario actual.
 *
 * @returns {Promise<object|false>}
 */
export const markAllNotificationsAsRead = async () =>
  requestAuthPayload(
    "/issues/notifications/read-all",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    "Error marking notifications as read:"
  );

/**
 * Elimina una notificación del usuario actual.
 *
 * @param {string} notificationId Id de la notificación.
 * @returns {Promise<object|false>}
 */
export const removeNotification = async (notificationId) =>
  requestAuthPayload(
    `/issues/notifications/${notificationId}`,
    { method: "DELETE" },
    "Error removing notification:"
  );
