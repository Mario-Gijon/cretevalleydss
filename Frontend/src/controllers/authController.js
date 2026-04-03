import {
  authFetch,
  setAccessToken,
  clearAccessToken,
  refreshAccessToken,
} from "../utils/authFetch";

/**
 * Estado vacío del usuario autenticado.
 *
 * @type {{
 *   university: string,
 *   name: string,
 *   email: string,
 *   accountCreation: string,
 *   role: string,
 *   isAdmin: boolean,
 * }}
 */
export const EmptyAuthState = {
  university: "",
  name: "",
  email: "",
  accountCreation: "",
  role: "user",
  isAdmin: false,
};

const API = import.meta.env.VITE_API_BACK;

/**
 * Intenta parsear una respuesta JSON sin lanzar excepción si no hay body.
 *
 * @param {Response} res Respuesta de fetch.
 * @returns {Promise<any|null>}
 */
const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
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
 * @returns {Promise<Record<string, any>|false>}
 */
export const fetchProtectedData = async () => {
  try {
    const res = await authFetch(`${API}/auth/me`, { method: "GET" });
    const data = await safeJson(res);
    return data?.success ? data : false;
  } catch (err) {
    console.error("Error fetching authenticated user:", err);
    return false;
  }
};

/**
 * Registra un nuevo usuario.
 *
 * @param {Record<string, any>} formValues Datos del formulario de registro.
 * @returns {Promise<Record<string, any>|false>}
 */
export const signup = async (formValues) => {
  try {
    const response = await fetch(`${API}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formValues),
    });

    return await safeJson(response);
  } catch (err) {
    console.error("Error during signup:", err);
    return false;
  }
};

/**
 * Inicia sesión y guarda el access token en memoria.
 *
 * @param {{ email: string, password: string }} formValues Credenciales.
 * @returns {Promise<Record<string, any>|false>}
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
  } catch (err) {
    console.error("Error during login:", err);
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
  } catch (err) {
    console.error("Error during logout:", err);
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
  } catch (err) {
    console.error("Error deleting account:", err);
    return false;
  }
};

/**
 * Actualiza la contraseña del usuario autenticado.
 *
 * @param {string} newPassword Nueva contraseña.
 * @param {string} repeatNewPassword Repetición de la nueva contraseña.
 * @returns {Promise<Record<string, any>|string|null>}
 */
export const updatePassword = async (newPassword, repeatNewPassword) => {
  try {
    const response = await authFetch(`${API}/auth/me/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword, repeatNewPassword }),
    });

    return await safeJson(response);
  } catch (err) {
    console.error("Error updating password:", err);
    return "An unexpected error occurred.";
  }
};

/**
 * Actualiza la universidad del usuario autenticado.
 *
 * @param {string} newUniversity Nueva universidad.
 * @returns {Promise<Record<string, any>|null>}
 */
export const modifyUniversity = async (newUniversity) => {
  try {
    const response = await authFetch(`${API}/auth/me/university`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newUniversity }),
    });

    return await safeJson(response);
  } catch (err) {
    console.error("Error updating university:", err);
    return { success: false, msg: "Unexpected error occurred" };
  }
};

/**
 * Actualiza el nombre del usuario autenticado.
 *
 * @param {string} newName Nuevo nombre.
 * @returns {Promise<Record<string, any>|null>}
 */
export const modifyName = async (newName) => {
  try {
    const response = await authFetch(`${API}/auth/me/name`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newName }),
    });

    return await safeJson(response);
  } catch (err) {
    console.error("Error updating name:", err);
    return { success: false, msg: "Unexpected error occurred" };
  }
};

/**
 * Solicita el cambio de email del usuario autenticado.
 *
 * @param {string} newEmail Nuevo email.
 * @returns {Promise<Record<string, any>|null>}
 */
export const modifyEmail = async (newEmail) => {
  try {
    const response = await authFetch(`${API}/auth/me/email`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail }),
    });

    return await safeJson(response);
  } catch (err) {
    console.error("Error updating email:", err);
    return { success: false, msg: "Unexpected error occurred" };
  }
};

/**
 * Obtiene las notificaciones del usuario actual.
 *
 * Este bloque no cambia en este paso.
 *
 * @returns {Promise<Record<string, any>|false>}
 */
export const getNotifications = async () => {
  try {
    const response = await authFetch(`${API}/issues/notifications`, {
      method: "GET",
    });
    return await safeJson(response);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    return false;
  }
};

/**
 * Marca como leídas todas las notificaciones del usuario actual.
 *
 * Este bloque no cambia en este paso.
 *
 * @returns {Promise<Record<string, any>|false>}
 */
export const markAllNotificationsAsRead = async () => {
  try {
    const response = await authFetch(`${API}/issues/notifications/read-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return await safeJson(response);
  } catch (err) {
    console.error("Error marking notifications as read:", err);
    return false;
  }
};

/**
 * Elimina una notificación del usuario actual.
 *
 * Este bloque no cambia en este paso.
 *
 * @param {string} notificationId Id de la notificación.
 * @returns {Promise<Record<string, any>|false>}
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
  } catch (err) {
    console.error("Error removing notification:", err);
    return false;
  }
};