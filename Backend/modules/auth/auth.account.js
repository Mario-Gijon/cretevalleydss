import { nanoid } from "nanoid";

import { User } from "../../models/Users.js";
import {
  createBadRequestError,
  createConflictError,
  createNotFoundError,
} from "../../utils/common/errors.js";

const withOptionalSession = (query, session = null) =>
  session ? query.session(session) : query;

/**
 * Registra un nuevo usuario pendiente de verificación.
 *
 * Mantiene el flujo actual de alta con token de confirmación,
 * añadiendo validación y normalización básica de entrada.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Record<string, any>} params.payload Cuerpo recibido.
 * @param {import("mongoose").ClientSession|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<{
 *   msg: string,
 *   verificationEmail: {
 *     name: string,
 *     email: string,
 *     token: string,
 *   }
 * }>}
 */
export const createSignupAccountFlow = async ({
  payload,
  session = null,
}) => {
  let {
    name = "",
    university = "",
    email = "",
    password = "",
  } = payload || {};

  name = String(name).trim();
  university = String(university).trim();
  email = String(email).trim().toLowerCase();
  password = String(password).trim();

  if (!name) {
    throw createBadRequestError("Name is required");
  }

  if (!university) {
    throw createBadRequestError("University is required");
  }

  if (!email) {
    throw createBadRequestError("Email is required");
  }

  if (!password) {
    throw createBadRequestError("Password is required");
  }

  if (password.length < 6) {
    throw createBadRequestError("Password must be at least 6 characters");
  }

  const existingUser = await withOptionalSession(
    User.findOne({ email }).lean(),
    session
  );

  if (existingUser) {
    throw createConflictError("Email already registered");
  }

  const tokenConfirm = nanoid();

  const user = new User({
    name,
    university,
    email,
    password,
    tokenConfirm,
  });

  await user.save({ session });

  return {
    msg: "Signup successful",
    verificationEmail: {
      name: user.name,
      email: user.email,
      token: tokenConfirm,
    },
  };
};

/**
 * Confirma una cuenta de usuario a partir del token de verificación.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.token Token recibido en la URL.
 * @param {import("mongoose").ClientSession|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<{ msg: string }>}
 */
export const confirmAccountFlow = async ({
  token,
  session = null,
}) => {
  const cleanToken = String(token ?? "").trim();

  if (!cleanToken) {
    throw createBadRequestError("Token is required");
  }

  const user = await withOptionalSession(
    User.findOne({ tokenConfirm: cleanToken }),
    session
  );

  if (!user) {
    throw createNotFoundError("Account confirmation not found");
  }

  user.accountConfirm = true;
  user.tokenConfirm = null;

  await user.save({ session });

  return {
    msg: "Account verified successfully",
  };
};

/**
 * Elimina la cuenta del usuario autenticado.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.userId Id del usuario autenticado.
 * @param {import("mongoose").ClientSession|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<{ msg: string }>}
 */
export const deleteAuthenticatedUserAccountFlow = async ({
  userId,
  session = null,
}) => {
  const user = await withOptionalSession(User.findById(userId), session);

  if (!user) {
    throw createNotFoundError("User not found");
  }

  await User.findByIdAndDelete(user._id).session(session);

  return {
    msg: "Account deleted successfully",
  };
};