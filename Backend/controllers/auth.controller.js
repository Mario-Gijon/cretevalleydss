import {
  confirmAuthenticatedEmailChange as confirmAuthenticatedEmailChangeUseCase,
  confirmSignupAccount,
  deleteAuthenticatedAccount,
  getAuthenticatedUserProfilePayload,
  loginUser as loginUserUseCase,
  requestAuthenticatedEmailChange,
  signupAccount,
  updateAuthenticatedName,
  updateAuthenticatedPassword,
  updateAuthenticatedUniversity,
} from "../modules/auth/index.js";
import { sendSuccess } from "../utils/common/responses.js";
import { generateRefreshToken } from "../services/token.service.js";

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
  return updateAuthenticatedPassword({
    userId: req.uid,
    newPassword: req.body?.newPassword,
    repeatNewPassword: req.body?.repeatNewPassword,
    beforeSessionCleanup: (result) =>
      sendSuccess(res, result.message, null, 200),
  });
};

export const modifyUniversity = async (req, res) => {
  return updateAuthenticatedUniversity({
    userId: req.uid,
    newUniversity: req.body?.newUniversity,
    beforeSessionCleanup: (result) =>
      sendSuccess(res, result.message, null, 200),
  });
};

export const modifyName = async (req, res) => {
  return updateAuthenticatedName({
    userId: req.uid,
    newName: req.body?.newName,
    beforeSessionCleanup: (result) =>
      sendSuccess(res, result.message, null, 200),
  });
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
  return requestAuthenticatedEmailChange({
    userId: req.uid,
    newEmail: req.body?.newEmail,
    beforeSessionCleanup: (result) =>
      sendSuccess(res, result.message, null, 200),
  });
};

export const confirmEmailChange = async (req, res) => {
  return confirmAuthenticatedEmailChangeUseCase({
    token: req.params?.token,
    beforeSessionCleanup: () => {
      setStatusCookie(res, "emailChangeStatus", "verified");
      return redirectToFrontend(res);
    },
    onErrorBeforeSessionCleanup: (error) => {
      const status = [400, 404, 409].includes(
        error?.statusCode ?? error?.status
      )
        ? "verification_failed"
        : "error";

      setStatusCookie(res, "emailChangeStatus", status);
      return redirectToFrontend(res);
    },
  });
};

export const signupUser = async (req, res) => {
  return signupAccount({
    payload: req.body,
    beforeSessionCleanup: (result) =>
      sendSuccess(res, result.message, null, 201),
  });
};

export const accountConfirm = async (req, res) => {
  return confirmSignupAccount({
    token: req.params?.token,
    beforeSessionCleanup: () => {
      setStatusCookie(res, "accountStatus", "verified");
      return redirectToFrontend(res);
    },
    onErrorBeforeSessionCleanup: (error) => {
      const status = [400, 404].includes(error?.statusCode ?? error?.status)
        ? "verification_failed"
        : "error";

      setStatusCookie(res, "accountStatus", status);
      return redirectToFrontend(res);
    },
  });
};

export const deleteAccount = async (req, res) => {
  return deleteAuthenticatedAccount({
    userId: req.uid,
    beforeSessionCleanup: (result) =>
      sendSuccess(res, result.message, null, 200),
  });
};
