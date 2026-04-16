import { User } from "../../models/Users.js";
import {
  createBadRequestError,
  createNotFoundError,
} from "../../utils/common/errors.js";

/**
 * @typedef {Object} AuthenticatedUserProfilePayload
 * @property {string} university Universidad del usuario.
 * @property {string} name Nombre del usuario.
 * @property {string} email Email del usuario.
 * @property {Date|null} accountCreation Fecha de creación de la cuenta.
 * @property {string} role Rol actual del usuario.
 * @property {boolean} isAdmin Indica si el usuario es administrador.
 */

const withOptionalSession = (query, session = null) =>
  session ? query.session(session) : query;

/**
 * Construye el payload público del usuario autenticado.
 *
 * @param {Object} user Documento de usuario.
 * @returns {AuthenticatedUserProfilePayload}
 */
const buildAuthenticatedUserProfilePayload = (user) => {
  const role = user?.role ?? "user";

  return {
    university: user?.university || "",
    name: user?.name || "",
    email: user?.email || "",
    accountCreation: user?.accountCreation || null,
    role,
    isAdmin: role === "admin",
  };
};

/**
 * Obtiene el perfil público del usuario autenticado.
 *
 * @param {Object} params Parámetros de entrada.
 * @param {string|Object} params.userId Id del usuario autenticado.
 * @returns {Promise<AuthenticatedUserProfilePayload>}
 */
export const getAuthenticatedUserProfilePayload = async ({ userId }) => {
  const user = await User.findById(userId).lean();

  if (!user) {
    throw createNotFoundError("User not found", {
      field: "userId",
    });
  }

  return buildAuthenticatedUserProfilePayload(user);
};

/**
 * Actualiza el nombre del usuario autenticado.
 *
 * @param {Object} params Parámetros de entrada.
 * @param {string|Object} params.userId Id del usuario autenticado.
 * @param {string} params.newName Nuevo nombre.
 * @param {Object|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<Object>}
 */
export const updateAuthenticatedUserNameFlow = async ({
  userId,
  newName,
  session = null,
}) => {
  const cleanName = String(newName ?? "").trim();

  if (!cleanName) {
    throw createBadRequestError("Name is required", {
      field: "newName",
    });
  }

  const user = await withOptionalSession(User.findById(userId), session);

  if (!user) {
    throw createNotFoundError("User not found", {
      field: "userId",
    });
  }

  user.name = cleanName;

  await user.save({ session });

  return {
    message: "Name updated successfully",
  };
};

/**
 * Actualiza la universidad del usuario autenticado.
 *
 * @param {Object} params Parámetros de entrada.
 * @param {string|Object} params.userId Id del usuario autenticado.
 * @param {string} params.newUniversity Nueva universidad.
 * @param {Object|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<Object>}
 */
export const updateAuthenticatedUserUniversityFlow = async ({
  userId,
  newUniversity,
  session = null,
}) => {
  const cleanUniversity = String(newUniversity ?? "").trim();

  if (!cleanUniversity) {
    throw createBadRequestError("University is required", {
      field: "newUniversity",
    });
  }

  const user = await withOptionalSession(User.findById(userId), session);

  if (!user) {
    throw createNotFoundError("User not found", {
      field: "userId",
    });
  }

  user.university = cleanUniversity;

  await user.save({ session });

  return {
    message: "University updated successfully",
  };
};

/**
 * Actualiza la contraseña del usuario autenticado.
 *
 * @param {Object} params Parámetros de entrada.
 * @param {string|Object} params.userId Id del usuario autenticado.
 * @param {string} params.newPassword Nueva contraseña.
 * @param {string} params.repeatNewPassword Repetición de la nueva contraseña.
 * @param {Object|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<Object>}
 */
export const updateAuthenticatedUserPasswordFlow = async ({
  userId,
  newPassword,
  repeatNewPassword,
  session = null,
}) => {
  const cleanPassword = String(newPassword ?? "");
  const cleanRepeatPassword = String(repeatNewPassword ?? "");

  if (!cleanPassword.trim()) {
    throw createBadRequestError("New password is required", {
      field: "newPassword",
    });
  }

  if (cleanPassword.length < 6) {
    throw createBadRequestError("Password must be at least 6 characters", {
      field: "newPassword",
    });
  }

  if (cleanPassword !== cleanRepeatPassword) {
    throw createBadRequestError("Passwords do not match", {
      field: "repeatNewPassword",
    });
  }

  const user = await withOptionalSession(User.findById(userId), session);

  if (!user) {
    throw createNotFoundError("User not found", {
      field: "userId",
    });
  }

  user.password = cleanPassword;
  user.markModified("password");

  await user.save({ session });

  return {
    message: "Password updated successfully",
  };
};