import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import { User } from "../models/Users.js";
import { generateToken, generateRefreshToken } from "../services/token.service.js";
import {
  sendEmailChangeConfirmation,
  sendVerificationEmail,
} from "../services/email.service.js";

const FRONTEND_REDIRECT_URL = `${process.env.ORIGIN_FRONT}/`;
const STATUS_COOKIE_OPTIONS = {
  secure: false,
  sameSite: "strict",
  maxAge: 30000,
};

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
  return res.redirect(FRONTEND_REDIRECT_URL);
};

/**
 * Cierra la sesión de mongoose.
 *
 * @param {import("mongoose").ClientSession} session Sesión activa.
 * @returns {Promise<void>}
 */
const endSessionSafely = async (session) => {
  if (session) {
    await session.endSession();
  }
};

/**
 * Aborta la transacción si sigue activa.
 *
 * @param {import("mongoose").ClientSession} session Sesión activa.
 * @returns {Promise<void>}
 */
const abortTransactionSafely = async (session) => {
  if (session?.inTransaction()) {
    await session.abortTransaction();
  }
};

/**
 * Inicia sesión y devuelve el token de acceso y refresh token.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({
        errors: { email: "User does not exist" },
        success: false,
      });
    }

    if (!user.accountConfirm) {
      return res.json({
        errors: { email: "Email not verified" },
        success: false,
      });
    }

    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      return res.json({
        errors: { password: "Incorrect password" },
        success: false,
      });
    }

    const role = user.role ?? "user";
    const { token, expiresIn } = generateToken(user._id, role);

    generateRefreshToken(user._id, res);

    return res.json({
      msg: "Login successful",
      token,
      expiresIn,
      role,
      isAdmin: role === "admin",
      success: true,
    });
  } catch (err) {
    console.error("Error during login:", err);
    return res.json({
      errors: { general: "Internal server error" },
      success: false,
    });
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
  const { name, university, email, password } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const existingUser = await User.findOne({ email }).session(session);

    if (existingUser) {
      await session.abortTransaction();
      return res.json({
        errors: { email: "Email already registered" },
        success: false,
      });
    }

    const user = new User({
      name,
      university,
      email,
      password,
      tokenConfirm: nanoid(),
    });

    await user.save({ session });

    await sendVerificationEmail({
      name: user.name,
      email: user.email,
      token: user.tokenConfirm,
    });

    await session.commitTransaction();

    return res.json({
      msg: "Signup successful",
      success: true,
    });
  } catch (err) {
    await abortTransactionSafely(session);
    console.error("Error during signup:", err);

    return res.json({
      errors: { general: err.message },
      success: false,
    });
  } finally {
    await endSessionSafely(session);
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

    const user = await User.findById(req.uid).session(session);

    if (!user) {
      await session.abortTransaction();
      return res.json({ msg: "User not found", success: false });
    }

    await User.findByIdAndDelete(user._id).session(session);

    await session.commitTransaction();

    return res.json({
      msg: "Account deleted successfully",
      success: true,
    });
  } catch (err) {
    await abortTransactionSafely(session);
    console.error("Error deleting account:", err);

    return res.json({
      msg: "Internal Server Error",
      success: false,
    });
  } finally {
    await endSessionSafely(session);
  }
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

    const user = await User.findById(req.uid).session(session);

    if (!user) {
      await session.abortTransaction();
      return res.json({ msg: "User not found", success: false });
    }

    const { newPassword, repeatNewPassword } = req.body;

    if (newPassword !== repeatNewPassword) {
      await session.abortTransaction();
      return res.json({ msg: "Passwords do not match", success: false });
    }

    user.password = newPassword;
    user.markModified("password");

    await user.save({ session });
    await session.commitTransaction();

    return res.json({
      msg: "Password updated successfully",
      success: true,
    });
  } catch (err) {
    await abortTransactionSafely(session);
    console.error("Error updating password:", err);

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
  const { newUniversity } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const user = await User.findById(req.uid).session(session);

    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        msg: "User not found",
      });
    }

    user.university = newUniversity;

    await user.save({ session });
    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      msg: "University updated successfully",
    });
  } catch (err) {
    await abortTransactionSafely(session);
    console.error(err);

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
  const { newName } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const user = await User.findById(req.uid).session(session);

    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        msg: "User not found",
      });
    }

    user.name = newName;

    await user.save({ session });
    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      msg: "Name updated successfully",
    });
  } catch (err) {
    await abortTransactionSafely(session);
    console.error(err);

    return res.status(500).json({
      success: false,
      msg: "Server error",
    });
  } finally {
    await endSessionSafely(session);
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
  const { newEmail } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const user = await User.findById(req.uid).session(session);

    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        msg: "User not found",
      });
    }

    const emailToken = jwt.sign({ newEmail }, process.env.JWT_SECRET);

    user.emailTokenConfirm = emailToken;
    await user.save({ session });

    await sendEmailChangeConfirmation({
      newEmail,
      token: emailToken,
    });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      msg: "Please, check new email for confirmation",
    });
  } catch (err) {
    await abortTransactionSafely(session);
    console.error(err);

    return res.status(500).json({
      success: false,
      msg: "Server error",
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
  const { token } = req.params;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const user = await User.findOne({ tokenConfirm: token }).session(session);

    if (!user) {
      await session.abortTransaction();
      setStatusCookie(res, "accountStatus", "verification_failed");
      return redirectToFrontend(res);
    }

    user.accountConfirm = true;
    user.tokenConfirm = null;

    await user.save({ session });
    await session.commitTransaction();

    setStatusCookie(res, "accountStatus", "verified");
    return redirectToFrontend(res);
  } catch (err) {
    await abortTransactionSafely(session);
    console.error(err);

    setStatusCookie(res, "accountStatus", "error");
    return redirectToFrontend(res);
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
  const { token } = req.params;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const user = await User.findOne({ emailTokenConfirm: token }).session(session);

    if (!user) {
      await session.abortTransaction();
      setStatusCookie(res, "emailChangeStatus", "verification_failed");
      return redirectToFrontend(res);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    user.email = decoded.newEmail;
    user.emailTokenConfirm = null;

    await user.save({ session });
    await session.commitTransaction();

    setStatusCookie(res, "emailChangeStatus", "verified");
    return redirectToFrontend(res);
  } catch (err) {
    await abortTransactionSafely(session);
    console.error(err);

    setStatusCookie(res, "emailChangeStatus", "error");
    return redirectToFrontend(res);
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
    const user = await User.findById(req.uid).lean();

    if (!user) {
      return res.json({
        msg: "User not found",
        success: false,
      });
    }

    const role = user.role ?? "user";

    return res.json({
      university: user.university,
      name: user.name,
      email: user.email,
      accountCreation: user.accountCreation,
      role,
      isAdmin: role === "admin",
      success: true,
    });
  } catch (err) {
    console.error(err);

    return res.json({
      msg: "Error fetching user data",
      success: false,
    });
  }
};