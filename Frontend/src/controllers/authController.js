// src/controllers/auth.controller.js (o donde lo tengas)
import { authFetch, setAccessToken, clearAccessToken, refreshAccessToken } from "../utils/authFetch";

// Estado de autenticación vacío
export const EmptyAuthState = {
  university: "",
  name: "",
  email: "",
  accountCreation: "",
  role: "user",
  isAdmin: false,
};

// Helpers
const API = import.meta.env.VITE_API_BACK;

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

// ✅ Opcional pero recomendado: usar al arrancar la app para recuperar sesión tras refresh de página
export const bootstrapSession = async () => {
  const token = await refreshAccessToken(); // usa cookie refreshToken
  return !!token;
};

// Función para obtener datos protegidos
export const fetchProtectedData = async () => {
  try {
    const res = await authFetch(`${API}/auth/protected`, { method: "GET" });
    const data = await safeJson(res);
    return data?.success ? data : false;
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false;
  }
};

// Función para registrarse
export const signup = async (formValues) => {
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formValues),
  };

  try {
    const response = await fetch(`${API}/auth/signup`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching form:", err);
    return false;
  }
};

// Función para iniciar sesión
export const login = async (formValues) => {
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formValues),
    credentials: "include", // ✅ para que te guarde la cookie refreshToken
  };

  try {
    const response = await fetch(`${API}/auth/login`, options);
    const data = await response.json();

    // ✅ si tu backend devuelve access token en login, lo guardas
    if (data?.success && data?.token) {
      setAccessToken(data.token);
    } else if (data?.success) {
      // ✅ si NO devuelve token, lo sacas 1 vez vía refresh
      await refreshAccessToken();
    }

    return data;
  } catch (err) {
    console.error("Error fetching form:", err);
    return false;
  }
};

// Función para realizar el logout
export const logout = async () => {
  try {
    const response = await fetch(`${API}/auth/logout`, {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();
    clearAccessToken(); // ✅ limpias access token en memoria

    return data?.success ? true : data?.msg;
  } catch (err) {
    console.error("Error logging out:", err);
    return false;
  }
};

// Función para eliminar la cuenta
export const deleteAccount = async () => {
  try {
    const response = await authFetch(`${API}/auth/deleteAccount`, {
      method: "DELETE",
    });

    const data = await safeJson(response);
    return data?.success ? true : data?.msg ?? false;
  } catch (err) {
    console.error("Error deleting account:", err);
    return false;
  }
};

// Función para actualizar la contraseña
export const updatePassword = async (newPassword, repeatNewPassword) => {
  try {
    const response = await authFetch(`${API}/auth/updatePassword`, {
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

// Función para modificar la universidad
export const modifyUniversity = async (newUniversity) => {
  try {
    const response = await authFetch(`${API}/auth/modifyUniversity`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newUniversity }),
    });

    return await safeJson(response);
  } catch (err) {
    console.error("Error verifying university:", err);
    return { success: false, msg: "Unexpected error occurred" };
  }
};

// Función para modificar el nombre
export const modifyName = async (newName) => {
  try {
    const response = await authFetch(`${API}/auth/modifyName`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newName }),
    });

    return await safeJson(response);
  } catch (err) {
    console.error("Error verifying name:", err);
    return { success: false, msg: "Unexpected error occurred" };
  }
};

// Función para modificar el email
export const modifyEmail = async (newEmail) => {
  try {
    const response = await authFetch(`${API}/auth/modifyEmail`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail }),
    });

    return await safeJson(response);
  } catch (err) {
    console.error("Error verifying email:", err);
    return { success: false, msg: "Unexpected error occurred" };
  }
};

// 🔔 Notificaciones (rutas protegidas -> authFetch)
export const getNotifications = async () => {
  try {
    const response = await authFetch(`${API}/issues/getNotifications`, { method: "GET" });
    return await safeJson(response);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    return false;
  }
};

export const markAllNotificationsAsRead = async () => {
  try {
    const response = await authFetch(`${API}/issues/markAllNotificationsAsRead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return await safeJson(response);
  } catch (err) {
    console.error("Error marking notifications as read:", err);
    return false;
  }
};

export const removeNotification = async (notificationId) => {
  try {
    const response = await authFetch(`${API}/issues/removeNotificationById`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    });
    return await safeJson(response);
  } catch (err) {
    console.error("Error removing notification:", err);
    return false;
  }
};