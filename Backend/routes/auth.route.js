import { Router } from "express";

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
  singupValidationRules,
  loginValidationRules,
  updatePasswordValidationRules,
  newUniversityValidationRules,
  newNameValidationRules,
  newEmailValidationRules,
} from "../middlewares/authValidations.js";
import { requireRefreshToken } from "../middlewares/requireRefreshToken.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";

const router = Router();

// Registro de usuario
router.post("/signup", singupValidationRules, signupUser);

// Inicio de sesión
router.post("/login", loginValidationRules, loginUser);

// Cierre de sesión
router.get("/logout", logout);

// Eliminar cuenta
router.delete("/deleteAccount", requireToken, deleteAccount);

// Cambiar contraseña
router.put(
  "/updatePassword",
  requireToken,
  updatePasswordValidationRules,
  updatePassword
);

// Cambiar universidad
router.put(
  "/modifyUniversity",
  requireToken,
  newUniversityValidationRules,
  modifyUniversity
);

// Cambiar nombre
router.put(
  "/modifyName",
  requireToken,
  newNameValidationRules,
  modifyName
);

// Cambiar email
router.put(
  "/modifyEmail",
  requireToken,
  newEmailValidationRules,
  modifyEmail
);

// Obtener datos del usuario autenticado
router.get("/protected", requireToken, infoUser);

// Renovar access token
router.get("/refresh", requireRefreshToken, refreshToken);

// Confirmar cuenta
router.get("/accountConfirm/:token", accountConfirm);

// Confirmar cambio de email
router.get("/confirmEmailChange/:token", confirmEmailChange);

// Comprobar acceso de administrador
router.get("/admin/check", requireToken, requireAdmin, (req, res) => {
  return res.json({ success: true, msg: "Admin access granted" });
});

export default router;