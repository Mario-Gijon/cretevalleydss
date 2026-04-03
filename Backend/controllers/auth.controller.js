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
import { generateRefreshToken } from "../services/token.service.js";
import {
  sendEmailChangeConfirmation,
  sendVerificationEmail,
} from "../services/email.service.js";
import {
  abortTransactionSafely,
  endSessionSafely,
} from "../utils/common/mongoose.js";
import { getErrorStatusCode } from "../utils/common/errors.js";

const STATUS_COOKIE_OPTIONS = { secure: false, sameSite: "strict", maxAge: 30000, };

/**
 * Añade una cookie temporal de estado para redirecciones del frontend.
 *
 * @param {import("express").Response} res Response de Express.
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
 * @param {import("express").Response} res Response de Express.
 * @returns {import("express").Response}
 */
const redirectToFrontend = (res) => {
  return res.redirect(`${process.env.ORIGIN_FRONT}/`);
};

/**
 * Inicia sesión y devuelve el token de acceso y refresh token.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const loginUser = async (req, res) => {
  try {
    const result = await loginUserFlow({
      email: req.body?.email,
      password: req.body?.password,
    });

    generateRefreshToken(result.userId, res);

    const { userId, ...payload } = result;

    return res.json({
      ...payload,
      success: true,
    });
  } catch (err) {
    console.error("loginUser error:", err);

    const statusCode = getErrorStatusCode(err);

    if (statusCode === 400) {
      return res.json({
        errors: {
          [err.field || "general"]: err.message,
        },
        success: false,
      });
    }

    return res.json({
      errors: { general: "Internal server error" },
      success: false,
    });
  }
};

/**
 * Cierra la sesión del usuario eliminando la cookie de refresh token.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {void}
 */
export const logout = (req, res) => {
  res.clearCookie("refreshToken");
  res.json({ msg: "Logged out successfully", success: true });
};

/**
 * Actualiza la contraseña del usuario autenticado.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const updatePassword = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const payload = await updateAuthenticatedUserPasswordFlow({
      userId: req.uid,
      newPassword: req.body?.newPassword,
      repeatNewPassword: req.body?.repeatNewPassword,
      session,
    });

    await session.commitTransaction();

    return res.json({
      success: true,
      ...payload,
    });
  } catch (err) {
    await abortTransactionSafely(session);
    console.error("updatePassword error:", err);

    const statusCode = getErrorStatusCode(err);

    if (statusCode === 400 || statusCode === 404) {
      return res.json({
        msg: err.message,
        success: false,
      });
    }

    return res.json({
      msg: "Internal Server Error",
      success: false,
    });
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Actualiza la universidad del usuario autenticado.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const modifyUniversity = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const payload = await updateAuthenticatedUserUniversityFlow({
      userId: req.uid,
      newUniversity: req.body?.newUniversity,
      session,
    });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      ...payload,
    });
  } catch (err) {
    await abortTransactionSafely(session);
    console.error("modifyUniversity error:", err);

    const statusCode = getErrorStatusCode(err);

    if (statusCode === 400 || statusCode === 404) {
      return res.status(statusCode).json({
        success: false,
        msg: err.message,
      });
    }

    return res.status(500).json({
      success: false,
      msg: "Server error",
    });
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Actualiza el nombre del usuario autenticado.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const modifyName = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const payload = await updateAuthenticatedUserNameFlow({
      userId: req.uid,
      newName: req.body?.newName,
      session,
    });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      ...payload,
    });
  } catch (err) {
    await abortTransactionSafely(session);
    console.error("modifyName error:", err);

    const statusCode = getErrorStatusCode(err);

    if (statusCode === 400 || statusCode === 404) {
      return res.status(statusCode).json({
        success: false,
        msg: err.message,
      });
    }

    return res.status(500).json({
      success: false,
      msg: "Server error",
    });
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Obtiene los datos del usuario autenticado.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const infoUser = async (req, res) => {
  try {
    const payload = await getAuthenticatedUserProfilePayload({
      userId: req.uid,
    });

    return res.json({
      ...payload,
      success: true,
    });
  } catch (err) {
    console.error("infoUser error:", err);

    const statusCode = getErrorStatusCode(err);

    if (statusCode === 404) {
      return res.json({
        msg: err.message,
        success: false,
      });
    }

    return res.json({
      msg: "Error fetching user data",
      success: false,
    });
  }
};

/**
 * Inicia el proceso de cambio de email enviando un correo de confirmación.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
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

    return res.status(200).json({
      success: true,
      msg: result.msg,
    });
  } catch (err) {
    await abortTransactionSafely(session);
    console.error("modifyEmail error:", err);

    const statusCode = getErrorStatusCode(err);

    if (statusCode === 400 || statusCode === 404 || statusCode === 409) {
      return res.status(statusCode).json({
        success: false,
        msg: err.message,
      });
    }

    return res.status(500).json({
      success: false,
      msg: "Server error",
    });
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Confirma el cambio de email a partir del token recibido.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<import("express").Response>}
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
  } catch (err) {
    await abortTransactionSafely(session);
    console.error("confirmEmailChange error:", err);

    const statusCode = getErrorStatusCode(err);

    if (statusCode === 400 || statusCode === 404 || statusCode === 409) {
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
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
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

    return res.json({
      msg: result.msg,
      success: true,
    });
  } catch (err) {
    await abortTransactionSafely(session);
    console.error("signupUser error:", err);

    const statusCode = getErrorStatusCode(err);

    if (statusCode === 400) {
      return res.json({
        errors: { general: err.message },
        success: false,
      });
    }

    if (statusCode === 409) {
      return res.json({
        errors: { email: err.message },
        success: false,
      });
    }

    return res.json({
      errors: { general: "Internal server error" },
      success: false,
    });
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Confirma una cuenta a partir del token de verificación.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<import("express").Response>}
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
  } catch (err) {
    await abortTransactionSafely(session);
    console.error("accountConfirm error:", err);

    const statusCode = getErrorStatusCode(err);

    if (statusCode === 400 || statusCode === 404) {
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
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const deleteAccount = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const payload = await deleteAuthenticatedUserAccountFlow({
      userId: req.uid,
      session,
    });

    await session.commitTransaction();

    return res.json({
      ...payload,
      success: true,
    });
  } catch (err) {
    await abortTransactionSafely(session);
    console.error("deleteAccount error:", err);

    const statusCode = getErrorStatusCode(err);

    if (statusCode === 404) {
      return res.json({
        msg: err.message,
        success: false,
      });
    }

    return res.json({
      msg: "Internal Server Error",
      success: false,
    });
  } finally {
    await endSessionSafely(session);
  }
};