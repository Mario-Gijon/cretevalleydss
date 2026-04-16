import { nanoid } from "nanoid";

import { User } from "../../models/Users.js";
import {
  createBadRequestError,
  createConflictError,
  createNotFoundError,
} from "../../utils/common/errors.js";

/**
 * @typedef {Object} SignupVerificationEmail
 * @property {string} name Nombre del usuario registrado.
 * @property {string} email Email del usuario registrado.
 * @property {string} token Token de confirmación de cuenta.
 */

/**
 * @typedef {Object} CreateSignupAccountResult
 * @property {string} message Mensaje de resultado.
 * @property {SignupVerificationEmail} verificationEmail Datos necesarios para enviar el correo de verificación.
 */

const withOptionalSession = (query, session = null) =>
  session ? query.session(session) : query;

/**
 * Registra un nuevo usuario pendiente de verificación.
 *
 * Mantiene el flujo actual de alta con token de confirmación,
 * añadiendo validación y normalización básica de entrada.
 *
 * @param {Object} params Parámetros de entrada.
 * @param {Object} params.payload Cuerpo recibido.
 * @param {Object|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<CreateSignupAccountResult>}
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
    throw createBadRequestError("Name is required", {
      field: "name",
    });
  }

  if (!university) {
    throw createBadRequestError("University is required", {
      field: "university",
    });
  }

  if (!email) {
    throw createBadRequestError("Email is required", {
      field: "email",
    });
  }

  if (!password) {
    throw createBadRequestError("Password is required", {
      field: "password",
    });
  }

  if (password.length < 6) {
    throw createBadRequestError("Password must be at least 6 characters", {
      field: "password",
    });
  }

  const existingUser = await withOptionalSession(
    User.findOne({ email }).lean(),
    session
  );

  if (existingUser) {
    throw createConflictError("Email already registered", {
      field: "email",
    });
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
    message: "Signup successful",
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
 * @param {Object} params Parámetros de entrada.
 * @param {string} params.token Token recibido en la URL.
 * @param {Object|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<Object>}
 */
export const confirmAccountFlow = async ({
  token,
  session = null,
}) => {
  const cleanToken = String(token ?? "").trim();

  if (!cleanToken) {
    throw createBadRequestError("Token is required", {
      field: "token",
    });
  }

  const user = await withOptionalSession(
    User.findOne({ tokenConfirm: cleanToken }),
    session
  );

  if (!user) {
    throw createNotFoundError("Account confirmation not found", {
      field: "token",
    });
  }

  user.accountConfirm = true;
  user.tokenConfirm = null;

  await user.save({ session });

  return {
    message: "Account verified successfully",
  };
};

/**
 * Elimina la cuenta del usuario autenticado.
 *
 * @param {Object} params Parámetros de entrada.
 * @param {string|Object} params.userId Id del usuario autenticado.
 * @param {Object|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<Object>}
 */
export const deleteAuthenticatedUserAccountFlow = async ({
  userId,
  session = null,
}) => {
  const user = await withOptionalSession(User.findById(userId), session);

  if (!user) {
    throw createNotFoundError("User not found", {
      field: "userId",
    });
  }

  await withOptionalSession(User.findByIdAndDelete(user._id), session);

  return {
    message: "Account deleted successfully",
  };
};