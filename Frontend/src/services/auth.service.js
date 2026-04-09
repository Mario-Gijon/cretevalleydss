import {
  authFetch,
  setAccessToken,
  clearAccessToken,
  refreshAccessToken,
} from "../utils/authFetch";
import { API, safeJson } from "./service.utils.js";

export const EmptyAuthState = {
  university: "",
  name: "",
  email: "",
  accountCreation: "",
  role: "user",
  isAdmin: false,
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
  try {
    const response = await authFetch(`${API}/auth/me`, { method: "GET" });
    const data = await safeJson(response);

    return data?.success ? data : false;
  } catch (error) {
    console.error("Error fetching authenticated user:", error);
    return false;
  }
};

/**
 * Registra un nuevo usuario.
 *
 * @param {object} formValues
 * @returns {Promise<object|false>}
 */
export const signup = async (formValues) => {
  try {
    const response = await fetch(`${API}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formValues),
    });

    return await safeJson(response);
  } catch (error) {
    console.error("Error during signup:", error);
    return false;
  }
};

/**
 * Inicia sesión y guarda el access token en memoria.
 *
 * @param {object} formValues
 * @returns {Promise<object|false>}
 */
export const login = async (formValues) => {
  try {
    const response = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formValues),
      credentials: "include",
    });

    const data = await safeJson(response);

    if (data?.success && data?.token) {
      setAccessToken(data.token);
    } else if (data?.success) {
      await refreshAccessToken();
    }

    return data;
  } catch (error) {
    console.error("Error during login:", error);
    return false;
  }
};

/**
 * Cierra la sesión actual y limpia el access token en memoria.
 *
 * @returns {Promise<true|string|false>}
 */
export const logout = async () => {
  try {
    const response = await fetch(`${API}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    const data = await safeJson(response);

    clearAccessToken();

    return data?.success ? true : data?.msg || false;
  } catch (error) {
    console.error("Error during logout:", error);
    return false;
  }
};

/**
 * Elimina la cuenta del usuario autenticado.
 *
 * @returns {Promise<true|string|false>}
 */
export const deleteAccount = async () => {
  try {
    const response = await authFetch(`${API}/auth/me`, {
      method: "DELETE",
    });

    const data = await safeJson(response);

    return data?.success ? true : data?.msg ?? false;
  } catch (error) {
    console.error("Error deleting account:", error);
    return false;
  }
};

/**
 * Actualiza la contraseña del usuario autenticado.
 *
 * @param {string} newPassword
 * @param {string} repeatNewPassword
 * @returns {Promise<object|string|null>}
 */
export const updatePassword = async (newPassword, repeatNewPassword) => {
  try {
    const response = await authFetch(`${API}/auth/me/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword, repeatNewPassword }),
    });

    return await safeJson(response);
  } catch (error) {
    console.error("Error updating password:", error);
    return "An unexpected error occurred.";
  }
};

/**
 * Actualiza la universidad del usuario autenticado.
 *
 * @param {string} newUniversity
 * @returns {Promise<object>}
 */
export const modifyUniversity = async (newUniversity) => {
  try {
    const response = await authFetch(`${API}/auth/me/university`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newUniversity }),
    });

    return await safeJson(response);
  } catch (error) {
    console.error("Error updating university:", error);
    return { success: false, msg: "Unexpected error occurred" };
  }
};

/**
 * Actualiza el nombre del usuario autenticado.
 *
 * @param {string} newName
 * @returns {Promise<object>}
 */
export const modifyName = async (newName) => {
  try {
    const response = await authFetch(`${API}/auth/me/name`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newName }),
    });

    return await safeJson(response);
  } catch (error) {
    console.error("Error updating name:", error);
    return { success: false, msg: "Unexpected error occurred" };
  }
};

/**
 * Solicita el cambio de email del usuario autenticado.
 *
 * @param {string} newEmail
 * @returns {Promise<object>}
 */
export const modifyEmail = async (newEmail) => {
  try {
    const response = await authFetch(`${API}/auth/me/email`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail }),
    });

    return await safeJson(response);
  } catch (error) {
    console.error("Error updating email:", error);
    return { success: false, msg: "Unexpected error occurred" };
  }
};

/**
 * Obtiene las notificaciones del usuario actual.
 *
 * @returns {Promise<object|false>}
 */
export const getNotifications = async () => {
  try {
    const response = await authFetch(`${API}/issues/notifications`, {
      method: "GET",
    });

    return await safeJson(response);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return false;
  }
};

/**
 * Marca como leídas todas las notificaciones del usuario actual.
 *
 * @returns {Promise<object|false>}
 */
export const markAllNotificationsAsRead = async () => {
  try {
    const response = await authFetch(`${API}/issues/notifications/read-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    return await safeJson(response);
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return false;
  }
};

/**
 * Elimina una notificación del usuario actual.
 *
 * @param {string} notificationId
 * @returns {Promise<object|false>}
 */
export const removeNotification = async (notificationId) => {
  try {
    const response = await authFetch(
      `${API}/issues/notifications/${notificationId}`,
      {
        method: "DELETE",
      }
    );

    return await safeJson(response);
  } catch (error) {
    console.error("Error removing notification:", error);
    return false;
  }
};