import { User } from "../../models/Users.js";

import {
  createBadRequestError,
  createNotFoundError,
} from "../../utils/common/errors.js";

const withOptionalSession = (query, session = null) =>
  session ? query.session(session) : query;

/**
 * Construye el payload público del usuario autenticado.
 *
 * @param {Record<string, any>} user Documento de usuario.
 * @returns {{
 *   university: string,
 *   name: string,
 *   email: string,
 *   accountCreation: Date | null,
 *   role: string,
 *   isAdmin: boolean,
 * }}
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
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.userId Id del usuario autenticado.
 * @returns {Promise<{
 *   university: string,
 *   name: string,
 *   email: string,
 *   accountCreation: Date | null,
 *   role: string,
 *   isAdmin: boolean,
 * }>}
 */
export const getAuthenticatedUserProfilePayload = async ({ userId }) => {
  const user = await User.findById(userId).lean();

  if (!user) {
    throw createNotFoundError("User not found");
  }

  return buildAuthenticatedUserProfilePayload(user);
};

/**
 * Actualiza el nombre del usuario autenticado.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.userId Id del usuario autenticado.
 * @param {string} params.newName Nuevo nombre.
 * @param {import("mongoose").ClientSession|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<{ msg: string }>}
 */
export const updateAuthenticatedUserNameFlow = async ({
  userId,
  newName,
  session = null,
}) => {
  const cleanName = String(newName ?? "").trim();

  if (!cleanName) {
    throw createBadRequestError("Name is required");
  }

  const user = await withOptionalSession(User.findById(userId), session);

  if (!user) {
    throw createNotFoundError("User not found");
  }

  user.name = cleanName;

  await user.save({ session });

  return {
    msg: "Name updated successfully",
  };
};

/**
 * Actualiza la universidad del usuario autenticado.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.userId Id del usuario autenticado.
 * @param {string} params.newUniversity Nueva universidad.
 * @param {import("mongoose").ClientSession|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<{ msg: string }>}
 */
export const updateAuthenticatedUserUniversityFlow = async ({
  userId,
  newUniversity,
  session = null,
}) => {
  const cleanUniversity = String(newUniversity ?? "").trim();

  if (!cleanUniversity) {
    throw createBadRequestError("University is required");
  }

  const user = await withOptionalSession(User.findById(userId), session);

  if (!user) {
    throw createNotFoundError("User not found");
  }

  user.university = cleanUniversity;

  await user.save({ session });

  return {
    msg: "University updated successfully",
  };
};

/**
 * Actualiza la contraseña del usuario autenticado.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.userId Id del usuario autenticado.
 * @param {string} params.newPassword Nueva contraseña.
 * @param {string} params.repeatNewPassword Repetición de la nueva contraseña.
 * @param {import("mongoose").ClientSession|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<{ msg: string }>}
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
    throw createBadRequestError("New password is required");
  }

  if (cleanPassword.length < 6) {
    throw createBadRequestError("Password must be at least 6 characters");
  }

  if (cleanPassword !== cleanRepeatPassword) {
    throw createBadRequestError("Passwords do not match");
  }

  const user = await withOptionalSession(User.findById(userId), session);

  if (!user) {
    throw createNotFoundError("User not found");
  }

  user.password = cleanPassword;
  user.markModified("password");

  await user.save({ session });

  return {
    msg: "Password updated successfully",
  };
};