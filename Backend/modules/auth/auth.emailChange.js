import jwt from "jsonwebtoken";

import { User } from "../../models/Users.js";
import {
  createBadRequestError,
  createConflictError,
  createNotFoundError,
} from "../../utils/common/errors.js";

const withOptionalSession = (query, session = null) =>
  session ? query.session(session) : query;

/**
 * @typedef {Object} EmailChangeConfirmationPayload
 * @property {string} newEmail Nuevo email pendiente de confirmar.
 * @property {string} token Token de confirmación del cambio.
 */

/**
 * @typedef {Object} RequestEmailChangeResult
 * @property {string} message Mensaje de resultado.
 * @property {EmailChangeConfirmationPayload} emailChangeConfirmation Datos necesarios para confirmar el cambio de email.
 */

/**
 * Inicia el cambio de email del usuario autenticado.
 *
 * Mantiene el flujo actual de token + confirmación por correo, añadiendo:
 * - validación de email vacío
 * - normalización básica del email
 * - comprobación de que el email nuevo sea distinto al actual
 * - comprobación de duplicados
 *
 * No envía el correo directamente. Devuelve los datos necesarios para que
 * la capa HTTP pueda hacerlo tras confirmar la transacción.
 *
 * @param {Object} params Parámetros de entrada.
 * @param {string|Object} params.userId Id del usuario autenticado.
 * @param {string} params.newEmail Nuevo email solicitado.
 * @param {Object|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<RequestEmailChangeResult>}
 */
export const requestAuthenticatedUserEmailChangeFlow = async ({
  userId,
  newEmail,
  session = null,
}) => {
  const cleanEmail = String(newEmail ?? "").trim().toLowerCase();

  if (!cleanEmail) {
    throw createBadRequestError("New email is required", {
      field: "newEmail",
    });
  }

  const user = await withOptionalSession(User.findById(userId), session);

  if (!user) {
    throw createNotFoundError("User not found", {
      field: "userId",
    });
  }

  const currentEmail = String(user.email ?? "").trim().toLowerCase();

  if (currentEmail === cleanEmail) {
    throw createBadRequestError(
      "New email must be different from the current email",
      {
        field: "newEmail",
      }
    );
  }

  const existingUser = await withOptionalSession(
    User.findOne({ email: cleanEmail }).select("_id").lean(),
    session
  );

  if (existingUser && String(existingUser._id) !== String(user._id)) {
    throw createConflictError("Email already registered", {
      field: "newEmail",
    });
  }

  const emailToken = jwt.sign({ newEmail: cleanEmail }, process.env.JWT_SECRET);

  user.emailTokenConfirm = emailToken;
  await user.save({ session });

  return {
    message: "Please, check new email for confirmation",
    emailChangeConfirmation: {
      newEmail: cleanEmail,
      token: emailToken,
    },
  };
};

/**
 * Confirma el cambio de email usando el token recibido.
 *
 * Mantiene el flujo actual basado en emailTokenConfirm, añadiendo:
 * - validación de token vacío
 * - validación del payload decodificado
 * - comprobación de duplicados antes de persistir el nuevo email
 *
 * @param {Object} params Parámetros de entrada.
 * @param {string} params.token Token recibido en la URL.
 * @param {Object|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<Object>}
 */
export const confirmAuthenticatedUserEmailChangeFlow = async ({
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
    User.findOne({ emailTokenConfirm: cleanToken }),
    session
  );

  if (!user) {
    throw createNotFoundError("Email change confirmation not found", {
      field: "token",
    });
  }

  let decoded = null;

  try {
    decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
  } catch (error) {
    throw createBadRequestError("Invalid email change token", {
      field: "token",
      cause: error,
    });
  }

  const newEmail = String(decoded?.newEmail ?? "").trim().toLowerCase();

  if (!newEmail) {
    throw createBadRequestError("Invalid email change token", {
      field: "token",
    });
  }

  const existingUser = await withOptionalSession(
    User.findOne({ email: newEmail }).select("_id").lean(),
    session
  );

  if (existingUser && String(existingUser._id) !== String(user._id)) {
    throw createConflictError("Email already registered", {
      field: "email",
    });
  }

  user.email = newEmail;
  user.emailTokenConfirm = null;

  await user.save({ session });

  return {
    message: "Email changed successfully",
  };
};