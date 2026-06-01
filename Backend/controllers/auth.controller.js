import mongoose from "mongoose";

import {
  confirmAccount,
  createSignupAccount,
  deleteAuthenticatedUserAccount,
} from "../modules/auth/account.js";
import {
  confirmAuthenticatedUserEmailChange,
  requestAuthenticatedUserEmailChange,
} from "../modules/auth/emailChange.js";
import {
  getAuthenticatedUserProfilePayload,
  updateAuthenticatedUserName,
  updateAuthenticatedUserPassword,
  updateAuthenticatedUserUniversity,
} from "../modules/auth/profile.js";
import { loginUser as loginUserUseCase } from "../modules/auth/session.js";
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

const setStatusCookie = (res, name, value) => {
  res.cookie(name, value, STATUS_COOKIE_OPTIONS);
};

const redirectToFrontend = (res) => {
  return res.redirect(`${process.env.ORIGIN_FRONT}/`);
};

export const loginUser = async (req, res) => {
  const result = await loginUserUseCase({
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

export const logout = (req, res) => {
  res.clearCookie("refreshToken");

  return sendSuccess(res, "Logged out successfully", null, 200);
};

export const updatePassword = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const result = await updateAuthenticatedUserPassword({
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

export const modifyUniversity = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const result = await updateAuthenticatedUserUniversity({
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

export const modifyName = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const result = await updateAuthenticatedUserName({
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

export const modifyEmail = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const result = await requestAuthenticatedUserEmailChange({
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

export const confirmEmailChange = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    await confirmAuthenticatedUserEmailChange({
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

export const signupUser = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const result = await createSignupAccount({
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

export const accountConfirm = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    await confirmAccount({
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

export const deleteAccount = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const result = await deleteAuthenticatedUserAccount({
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
