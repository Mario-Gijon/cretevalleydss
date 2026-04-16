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

/**
 * @openapi
 * /auth/signup:
 *   post:
 *     tags:
 *       - Auth
 *     security: []
 *     summary: Registra un nuevo usuario
 *     description: |
 *       Crea una cuenta pendiente de confirmación y envía un correo de verificación.
 *       Aplica validaciones previas con express-validator.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - university
 *               - email
 *               - password
 *               - repeatPassword
 *             properties:
 *               name:
 *                 type: string
 *                 example: Mario
 *               university:
 *                 type: string
 *                 example: Universidad de Granada
 *               email:
 *                 type: string
 *                 format: email
 *                 example: mario@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: secret123
 *               repeatPassword:
 *                 type: string
 *                 format: password
 *                 example: secret123
 *     responses:
 *       201:
 *         description: Registro completado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Signup successful
 *                 data:
 *                   nullable: true
 *                   example: null
 *       400:
 *         description: Error de validación o solicitud inválida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *                 - error
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Validation failed.
 *                 data:
 *                   nullable: true
 *                   example: null
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: BAD_REQUEST
 *                     field:
 *                       type: string
 *                       nullable: true
 *                       example: email
 *                     details:
 *                       type: object
 *                       nullable: true
 *                       additionalProperties: true
 *       409:
 *         description: Conflicto por email ya registrado
 *       500:
 *         description: Error interno del servidor
 */
router.post("/signup", signupValidationRules, asyncHandler(signupUser));

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     security: []
 *     summary: Inicia sesión
 *     description: |
 *       Valida las credenciales del usuario, devuelve un access token
 *       y genera la cookie de refresh token.
 *       Aplica validaciones previas con express-validator.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: mario@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: secret123
 *     responses:
 *       200:
 *         description: Login realizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   required:
 *                     - userId
 *                     - token
 *                     - expiresIn
 *                     - role
 *                     - isAdmin
 *                   properties:
 *                     userId:
 *                       type: string
 *                     token:
 *                       type: string
 *                     expiresIn:
 *                       type: integer
 *                       example: 900
 *                     role:
 *                       type: string
 *                       example: user
 *                     isAdmin:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Error de validación o credenciales inválidas
 *       500:
 *         description: Error interno del servidor
 */
router.post("/login", loginValidationRules, asyncHandler(loginUser));

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     security: []
 *     summary: Cierra la sesión actual
 *     description: Elimina la cookie de refresh token del usuario actual.
 *     responses:
 *       200:
 *         description: Sesión cerrada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *                 data:
 *                   nullable: true
 *                   example: null
 */
router.post("/logout", asyncHandler(logout));

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Obtiene el perfil del usuario autenticado
 *     description: |
 *       Devuelve los datos públicos del usuario autenticado.
 *       Requiere un access token válido en la cabecera Authorization.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User data fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         university:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                           format: email
 *                         accountCreation:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         role:
 *                           type: string
 *                         isAdmin:
 *                           type: boolean
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 *   delete:
 *     tags:
 *       - Auth
 *     summary: Elimina la cuenta del usuario autenticado
 *     description: |
 *       Elimina la cuenta del usuario autenticado.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cuenta eliminada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Account deleted successfully
 *                 data:
 *                   nullable: true
 *                   example: null
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/me", requireToken, asyncHandler(infoUser));
router.delete("/me", requireToken, asyncHandler(deleteAccount));

/**
 * @openapi
 * /auth/me/password:
 *   put:
 *     tags:
 *       - Auth
 *     summary: Actualiza la contraseña del usuario autenticado
 *     description: |
 *       Actualiza la contraseña del usuario autenticado.
 *       Requiere un access token válido.
 *       Aplica validaciones previas con express-validator.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *               - repeatNewPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: newSecret123
 *               repeatNewPassword:
 *                 type: string
 *                 format: password
 *                 example: newSecret123
 *     responses:
 *       200:
 *         description: Contraseña actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password updated successfully
 *                 data:
 *                   nullable: true
 *                   example: null
 *       400:
 *         description: Error de validación o solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put(
  "/me/password",
  requireToken,
  updatePasswordValidationRules,
  asyncHandler(updatePassword)
);

/**
 * @openapi
 * /auth/me/university:
 *   patch:
 *     tags:
 *       - Auth
 *     summary: Actualiza la universidad del usuario autenticado
 *     description: |
 *       Actualiza la universidad del usuario autenticado.
 *       Requiere un access token válido.
 *       Aplica validaciones previas con express-validator.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newUniversity
 *             properties:
 *               newUniversity:
 *                 type: string
 *                 example: Universidad de Granada
 *     responses:
 *       200:
 *         description: Universidad actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: University updated successfully
 *                 data:
 *                   nullable: true
 *                   example: null
 *       400:
 *         description: Error de validación o solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.patch(
  "/me/university",
  requireToken,
  newUniversityValidationRules,
  asyncHandler(modifyUniversity)
);

/**
 * @openapi
 * /auth/me/name:
 *   patch:
 *     tags:
 *       - Auth
 *     summary: Actualiza el nombre del usuario autenticado
 *     description: |
 *       Actualiza el nombre del usuario autenticado.
 *       Requiere un access token válido.
 *       Aplica validaciones previas con express-validator.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newName
 *             properties:
 *               newName:
 *                 type: string
 *                 example: Mario Gijón
 *     responses:
 *       200:
 *         description: Nombre actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Name updated successfully
 *                 data:
 *                   nullable: true
 *                   example: null
 *       400:
 *         description: Error de validación o solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.patch(
  "/me/name",
  requireToken,
  newNameValidationRules,
  asyncHandler(modifyName)
);

/**
 * @openapi
 * /auth/me/email:
 *   patch:
 *     tags:
 *       - Auth
 *     summary: Solicita el cambio de email del usuario autenticado
 *     description: |
 *       Genera un token de confirmación y envía un correo al nuevo email.
 *       El cambio real no se aplica hasta confirmar el token.
 *       Requiere un access token válido.
 *       Aplica validaciones previas con express-validator.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newEmail
 *             properties:
 *               newEmail:
 *                 type: string
 *                 format: email
 *                 example: mario.new@example.com
 *     responses:
 *       200:
 *         description: Solicitud de cambio de email procesada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Please, check new email for confirmation
 *                 data:
 *                   nullable: true
 *                   example: null
 *       400:
 *         description: Error de validación o solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Usuario no encontrado
 *       409:
 *         description: Conflicto por email ya registrado
 *       500:
 *         description: Error interno del servidor
 */
router.patch(
  "/me/email",
  requireToken,
  newEmailValidationRules,
  asyncHandler(modifyEmail)
);

/**
 * @openapi
 * /auth/refresh:
 *   get:
 *     tags:
 *       - Auth
 *     security: []
 *     summary: Renueva el access token
 *     description: |
 *       Usa la cookie `refreshToken` para emitir un nuevo access token.
 *       El middleware previo valida la cookie y añade `req.uid`.
 *     responses:
 *       200:
 *         description: Access token renovado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Access token refreshed successfully.
 *                 data:
 *                   type: object
 *                   required:
 *                     - token
 *                     - expiresIn
 *                   properties:
 *                     token:
 *                       type: string
 *                     expiresIn:
 *                       type: integer
 *                       example: 900
 *       401:
 *         description: Refresh token ausente, inválido o usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/refresh", requireRefreshToken, refreshToken);

/**
 * @openapi
 * /auth/account/confirm/{token}:
 *   get:
 *     tags:
 *       - Auth
 *     security: []
 *     summary: Confirma una cuenta de usuario
 *     description: |
 *       Valida el token de confirmación y redirige al frontend principal.
 *       El resultado se expone mediante una cookie temporal `accountStatus`.
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         description: Token de confirmación de cuenta
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirección al frontend con el resultado de la confirmación
 */
router.get("/account/confirm/:token", asyncHandler(accountConfirm));

/**
 * @openapi
 * /auth/email-change/confirm/{token}:
 *   get:
 *     tags:
 *       - Auth
 *     security: []
 *     summary: Confirma un cambio de email
 *     description: |
 *       Valida el token de cambio de email y redirige al frontend principal.
 *       El resultado se expone mediante una cookie temporal `emailChangeStatus`.
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         description: Token de confirmación del cambio de email
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirección al frontend con el resultado de la confirmación
 */
router.get("/email-change/confirm/:token", asyncHandler(confirmEmailChange));

/**
 * @openapi
 * /auth/admin/check:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Comprueba acceso de administrador
 *     description: |
 *       Verifica que el usuario autenticado tenga un access token válido
 *       y además rol de administrador.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Acceso de administrador validado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Admin access granted
 *                 data:
 *                   nullable: true
 *                   example: null
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       403:
 *         description: Usuario autenticado sin permisos de administrador
 */
router.get("/admin/check", requireToken, requireAdmin, (req, res) => {
  return sendSuccess(res, "Admin access granted");
});

export default router;