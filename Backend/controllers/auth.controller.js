import mongoose from "mongoose";

import {
  confirmAccountFlow,
  createSignupAccountFlow,
  deleteAuthenticatedUserAccountFlow,
} from "../modules/auth/auth.account.js";
import {
  confirmAuthenticatedUserEmailChangeFlow,
  requestAuthenticatedUserEmailChangeFlow,
} from "../modules/auth/auth.emailChange.js";
import {
  getAuthenticatedUserProfilePayload,
  updateAuthenticatedUserNameFlow,
  updateAuthenticatedUserPasswordFlow,
  updateAuthenticatedUserUniversityFlow,
} from "../modules/auth/auth.profile.js";
import { loginUserFlow } from "../modules/auth/auth.session.js";
import { sendSuccess } from "../utils/common/responses.js";
import { generateRefreshToken } from "../services/token.service.js";
import {
  sendEmailChangeConfirmation,
  sendVerificationEmail,
} from "../services/email.service.js";
import {
  abortTransactionSafely,
  endSessionSafely,
} from "../utils/common/mongoose.js";

const STATUS_COOKIE_OPTIONS = {
  secure: false,
  sameSite: "strict",
  maxAge: 30000,
};

/**
 * Añade una cookie temporal de estado para redirecciones del frontend.
 *
 * @param {Object} res Response de Express.
 * @param {string} name Nombre de la cookie.
 * @param {string} value Valor de la cookie.
 * @returns {void}
 */
const setStatusCookie = (res, name, value) => {
  res.cookie(name, value, STATUS_COOKIE_OPTIONS);
};

/**
 * Redirige al frontend principal.
 *
 * @param {Object} res Response de Express.
 * @returns {Object}
 */
const redirectToFrontend = (res) => {
  return res.redirect(`${process.env.ORIGIN_FRONT}/`);
};

/**
 * Inicia sesión y devuelve la respuesta de autenticación.
 *
 * Los errores se delegan al middleware global de errores.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const loginUser = async (req, res) => {
  const result = await loginUserFlow({
    email: req.body?.email,
    password: req.body?.password,
  });

  generateRefreshToken(result.userId, res);

  return sendSuccess(
    res,
    result.message,
    {
      userId: result.userId,
      token: result.token,
      expiresIn: result.expiresIn,
      role: result.role,
      isAdmin: result.isAdmin,
    },
    200
  );
};

/**
 * Cierra la sesión del usuario eliminando la cookie de refresh token.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Object}
 */
export const logout = (req, res) => {
  res.clearCookie("refreshToken");

  return sendSuccess(res, "Logged out successfully", null, 200);
};

/**
 * Actualiza la contraseña del usuario autenticado.
 *
 * En caso de error solo se gestiona el rollback de la transacción;
 * la respuesta HTTP final se delega al middleware global de errores.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const updatePassword = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const result = await updateAuthenticatedUserPasswordFlow({
      userId: req.uid,
      newPassword: req.body?.newPassword,
      repeatNewPassword: req.body?.repeatNewPassword,
      session,
    });

    await session.commitTransaction();

    return sendSuccess(res, result.message, null, 200);
  } catch (error) {
    await abortTransactionSafely(session);
    throw error;
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Actualiza la universidad del usuario autenticado.
 *
 * En caso de error solo se gestiona el rollback de la transacción;
 * la respuesta HTTP final se delega al middleware global de errores.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const modifyUniversity = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const result = await updateAuthenticatedUserUniversityFlow({
      userId: req.uid,
      newUniversity: req.body?.newUniversity,
      session,
    });

    await session.commitTransaction();

    return sendSuccess(res, result.message, null, 200);
  } catch (error) {
    await abortTransactionSafely(session);
    throw error;
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Actualiza el nombre del usuario autenticado.
 *
 * En caso de error solo se gestiona el rollback de la transacción;
 * la respuesta HTTP final se delega al middleware global de errores.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const modifyName = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const result = await updateAuthenticatedUserNameFlow({
      userId: req.uid,
      newName: req.body?.newName,
      session,
    });

    await session.commitTransaction();

    return sendSuccess(res, result.message, null, 200);
  } catch (error) {
    await abortTransactionSafely(session);
    throw error;
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Obtiene los datos del usuario autenticado.
 *
 * Los errores se delegan al middleware global de errores.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const infoUser = async (req, res) => {
  const profile = await getAuthenticatedUserProfilePayload({
    userId: req.uid,
  });

  return sendSuccess(
    res,
    "User data fetched successfully",
    {
      user: profile,
    },
    200
  );
};

/**
 * Inicia el proceso de cambio de email enviando un correo de confirmación.
 *
 * En caso de error solo se gestiona el rollback de la transacción;
 * la respuesta HTTP final se delega al middleware global de errores.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const modifyEmail = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const result = await requestAuthenticatedUserEmailChangeFlow({
      userId: req.uid,
      newEmail: req.body?.newEmail,
      session,
    });

    await session.commitTransaction();

    await sendEmailChangeConfirmation(result.emailChangeConfirmation);

    return sendSuccess(res, result.message, null, 200);
  } catch (error) {
    await abortTransactionSafely(session);
    throw error;
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Confirma el cambio de email a partir del token recibido.
 *
 * Mantiene la lógica de redirección y cookies de estado.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const confirmEmailChange = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    await confirmAuthenticatedUserEmailChangeFlow({
      token: req.params?.token,
      session,
    });

    await session.commitTransaction();

    setStatusCookie(res, "emailChangeStatus", "verified");
    return redirectToFrontend(res);
  } catch (error) {
    await abortTransactionSafely(session);

    if ([400, 404, 409].includes(error?.statusCode ?? error?.status)) {
      setStatusCookie(res, "emailChangeStatus", "verification_failed");
      return redirectToFrontend(res);
    }

    setStatusCookie(res, "emailChangeStatus", "error");
    return redirectToFrontend(res);
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Registra un nuevo usuario y envía el correo de verificación.
 *
 * En caso de error solo se gestiona el rollback de la transacción;
 * la respuesta HTTP final se delega al middleware global de errores.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const signupUser = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const result = await createSignupAccountFlow({
      payload: req.body,
      session,
    });

    await session.commitTransaction();

    await sendVerificationEmail(result.verificationEmail);

    return sendSuccess(res, result.message, null, 201);
  } catch (error) {
    await abortTransactionSafely(session);
    throw error;
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Confirma una cuenta a partir del token de verificación.
 *
 * Mantiene la lógica de redirección y cookies de estado.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const accountConfirm = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    await confirmAccountFlow({
      token: req.params?.token,
      session,
    });

    await session.commitTransaction();

    setStatusCookie(res, "accountStatus", "verified");
    return redirectToFrontend(res);
  } catch (error) {
    await abortTransactionSafely(session);

    if ([400, 404].includes(error?.statusCode ?? error?.status)) {
      setStatusCookie(res, "accountStatus", "verification_failed");
      return redirectToFrontend(res);
    }

    setStatusCookie(res, "accountStatus", "error");
    return redirectToFrontend(res);
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Elimina la cuenta del usuario autenticado.
 *
 * En caso de error solo se gestiona el rollback de la transacción;
 * la respuesta HTTP final se delega al middleware global de errores.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @returns {Promise<Object>}
 */
export const deleteAccount = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const result = await deleteAuthenticatedUserAccountFlow({
      userId: req.uid,
      session,
    });

    await session.commitTransaction();

    return sendSuccess(res, result.message, null, 200);
  } catch (error) {
    await abortTransactionSafely(session);
    throw error;
  } finally {
    await endSessionSafely(session);
  }
};