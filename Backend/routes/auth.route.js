import { Router } from "express";

import { asyncHandler } from "../middlewares/asyncHandler.js";

import {
  loginUser,
  signupUser,
  logout,
  deleteAccount,
  updatePassword,
  accountConfirm,
  infoUser,
  modifyUniversity,
  modifyName,
  modifyEmail,
  confirmEmailChange,
} from "../controllers/auth.controller.js";

import { requireToken } from "../middlewares/requireToken.js";
import { refreshToken } from "../middlewares/refreshToken.js";
import {
  signupValidationRules,
  loginValidationRules,
  updatePasswordValidationRules,
  newUniversityValidationRules,
  newNameValidationRules,
  newEmailValidationRules,
} from "../middlewares/authValidations.js";
import { requireRefreshToken } from "../middlewares/requireRefreshToken.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import { sendSuccess } from "../utils/common/responses.js";

const router = Router();

router.post("/signup", signupValidationRules, asyncHandler(signupUser));

router.post("/login", loginValidationRules, asyncHandler(loginUser));

router.post("/logout", asyncHandler(logout));

router.get("/me", requireToken, asyncHandler(infoUser));
router.delete("/me", requireToken, asyncHandler(deleteAccount));

router.put(
  "/me/password",
  requireToken,
  updatePasswordValidationRules,
  asyncHandler(updatePassword)
);

router.patch(
  "/me/university",
  requireToken,
  newUniversityValidationRules,
  asyncHandler(modifyUniversity)
);

router.patch(
  "/me/name",
  requireToken,
  newNameValidationRules,
  asyncHandler(modifyName)
);

router.patch(
  "/me/email",
  requireToken,
  newEmailValidationRules,
  asyncHandler(modifyEmail)
);

router.get("/refresh", requireRefreshToken, refreshToken);

router.get("/account/confirm/:token", asyncHandler(accountConfirm));

router.get("/email-change/confirm/:token", asyncHandler(confirmEmailChange));

router.get("/admin/check", requireToken, requireAdmin, (req, res) => {
  return sendSuccess(res, "Admin access granted");
});

export default router;