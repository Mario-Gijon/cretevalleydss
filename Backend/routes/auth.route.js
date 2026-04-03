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

/**
 * @openapi
 * /auth/signup:
 *   post:
 *     tags:
 *       - Auth
 *     security: []
 *     summary: Registra un nuevo usuario
 *     description: |
 *       Crea una cuenta pendiente de confirmación y envía el correo de verificación.
 *       Antes de ejecutar el controller, se aplican validaciones con express-validator.
 *
 *       Actualmente este endpoint devuelve HTTP 200 tanto en éxito como en
 *       errores de validación middleware o errores funcionales del controller,
 *       diferenciando el resultado mediante el contenido del body.
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
 *       200:
 *         description: |
 *           Resultado del registro. Puede representar éxito, error de validación
 *           middleware o error funcional del controller.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   required:
 *                     - success
 *                     - msg
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     msg:
 *                       type: string
 *                       example: Signup successful
 *                 - type: object
 *                   required:
 *                     - errors
 *                   properties:
 *                     errors:
 *                       type: object
 *                       additionalProperties:
 *                         type: string
 *                       example:
 *                         email: Invalid email
 *                 - type: object
 *                   required:
 *                     - success
 *                     - errors
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     errors:
 *                       type: object
 *                       additionalProperties:
 *                         type: string
 *                       example:
 *                         email: Email already registered
 */
router.post("/signup", singupValidationRules, signupUser);

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
 *
 *       Antes de ejecutar el controller, se aplican validaciones con express-validator.
 *       Actualmente responde con HTTP 200 tanto en éxito como en errores de validación
 *       o credenciales, diferenciando el resultado mediante el body.
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
 *         description: |
 *           Resultado del login. Puede representar éxito, error de validación
 *           middleware o error funcional del controller.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   required:
 *                     - success
 *                     - msg
 *                     - token
 *                     - expiresIn
 *                     - role
 *                     - isAdmin
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     msg:
 *                       type: string
 *                       example: Login successful
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     expiresIn:
 *                       oneOf:
 *                         - type: integer
 *                         - type: string
 *                       example: 3600
 *                     role:
 *                       type: string
 *                       example: user
 *                     isAdmin:
 *                       type: boolean
 *                       example: false
 *                 - type: object
 *                   required:
 *                     - errors
 *                   properties:
 *                     errors:
 *                       type: object
 *                       additionalProperties:
 *                         type: string
 *                       example:
 *                         email: Invalid email
 *                 - type: object
 *                   required:
 *                     - success
 *                     - errors
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     errors:
 *                       type: object
 *                       additionalProperties:
 *                         type: string
 *                       example:
 *                         password: Incorrect password
 */
router.post("/login", loginValidationRules, loginUser);

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
 *                 - msg
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 msg:
 *                   type: string
 *                   example: Logged out successfully
 */
router.post("/logout", logout);

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
 *
 *       Actualmente este endpoint responde con HTTP 200 tanto en éxito como en
 *       algunos errores lógicos del controller, y con HTTP 401 si falla el middleware
 *       de autenticación.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido o error lógico del controller
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   required:
 *                     - success
 *                     - university
 *                     - name
 *                     - email
 *                     - accountCreation
 *                     - role
 *                     - isAdmin
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     university:
 *                       type: string
 *                       example: Universidad de Granada
 *                     name:
 *                       type: string
 *                       example: Mario
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: mario@example.com
 *                     accountCreation:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     role:
 *                       type: string
 *                       example: user
 *                     isAdmin:
 *                       type: boolean
 *                       example: false
 *                 - type: object
 *                   required:
 *                     - success
 *                     - msg
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     msg:
 *                       type: string
 *                       example: Error fetching user data
 *       401:
 *         description: Access token ausente, expirado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - msg
 *                 - success
 *                 - code
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Invalid token
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: TOKEN_INVALID
 */
router.get("/me", requireToken, infoUser);

/**
 * @openapi
 * /auth/me:
 *   delete:
 *     tags:
 *       - Auth
 *     summary: Elimina la cuenta del usuario autenticado
 *     description: |
 *       Elimina la cuenta del usuario autenticado.
 *       Requiere un access token válido.
 *
 *       Actualmente este endpoint responde con HTTP 200 tanto en éxito como en
 *       algunos errores lógicos del controller, y con HTTP 401 si falla el middleware
 *       de autenticación.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cuenta eliminada o error lógico del controller
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - msg
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 msg:
 *                   type: string
 *                   example: Account deleted successfully
 *       401:
 *         description: Access token ausente, expirado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - msg
 *                 - success
 *                 - code
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Token expired
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: TOKEN_EXPIRED
 */
router.delete("/me", requireToken, deleteAccount);

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
 *
 *       Antes de ejecutar el controller, se aplican validaciones con express-validator.
 *       Actualmente este endpoint puede responder:
 *       - 401 si falla el middleware de autenticación
 *       - 200 si la validación middleware falla
 *       - 200 si el controller termina en éxito o en ciertos errores lógicos
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
 *         description: |
 *           Contraseña actualizada, error de validación middleware o error lógico del controller.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   required:
 *                     - success
 *                     - msg
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     msg:
 *                       type: string
 *                       example: Password updated successfully
 *                 - type: object
 *                   required:
 *                     - errors
 *                   properties:
 *                     errors:
 *                       type: object
 *                       additionalProperties:
 *                         type: string
 *                       example:
 *                         newPassword: Password must be at least 6 characters, with at least 1 number and 1 letter
 *                 - type: object
 *                   required:
 *                     - success
 *                     - msg
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     msg:
 *                       type: string
 *                       example: Passwords do not match
 *       401:
 *         description: Access token ausente, expirado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - msg
 *                 - success
 *                 - code
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Token does not exist
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: NO_TOKEN
 */
router.put(
  "/me/password",
  requireToken,
  updatePasswordValidationRules,
  updatePassword
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
 *
 *       Antes de ejecutar el controller, se aplican validaciones con express-validator.
 *       Puede responder con 200 en éxito o error de validación middleware,
 *       y con 400, 404 o 500 en errores del controller.
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
 *         description: Universidad actualizada o error de validación middleware
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   required:
 *                     - success
 *                     - msg
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     msg:
 *                       type: string
 *                       example: University updated successfully
 *                 - type: object
 *                   required:
 *                     - errors
 *                   properties:
 *                     errors:
 *                       type: object
 *                       additionalProperties:
 *                         type: string
 *                       example:
 *                         newUniversity: Only letters and spaces, min 2, max 25
 *       400:
 *         description: Solicitud inválida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - msg
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 msg:
 *                   type: string
 *                   example: University is required
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - msg
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 msg:
 *                   type: string
 *                   example: User not found
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - msg
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 msg:
 *                   type: string
 *                   example: Server error
 *       401:
 *         description: Access token ausente, expirado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - msg
 *                 - success
 *                 - code
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Invalid token
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: TOKEN_INVALID
 */
router.patch(
  "/me/university",
  requireToken,
  newUniversityValidationRules,
  modifyUniversity
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
 *
 *       Antes de ejecutar el controller, se aplican validaciones con express-validator.
 *       Puede responder con 200 en éxito o error de validación middleware,
 *       y con 400, 404 o 500 en errores del controller.
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
 *         description: Nombre actualizado o error de validación middleware
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   required:
 *                     - success
 *                     - msg
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     msg:
 *                       type: string
 *                       example: Name updated successfully
 *                 - type: object
 *                   required:
 *                     - errors
 *                   properties:
 *                     errors:
 *                       type: object
 *                       additionalProperties:
 *                         type: string
 *                       example:
 *                         newName: Only letters and spaces, min 2, max 25
 *       400:
 *         description: Solicitud inválida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - msg
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 msg:
 *                   type: string
 *                   example: Name is required
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - msg
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 msg:
 *                   type: string
 *                   example: User not found
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - msg
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 msg:
 *                   type: string
 *                   example: Server error
 *       401:
 *         description: Access token ausente, expirado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - msg
 *                 - success
 *                 - code
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Token expired
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: TOKEN_EXPIRED
 */
router.patch(
  "/me/name",
  requireToken,
  newNameValidationRules,
  modifyName
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
 *
 *       Requiere un access token válido.
 *       Antes de ejecutar el controller, se aplican validaciones con express-validator.
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
 *         description: Solicitud procesada o error de validación middleware
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   required:
 *                     - success
 *                     - msg
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     msg:
 *                       type: string
 *                       example: Please, check new email for confirmation
 *                 - type: object
 *                   required:
 *                     - errors
 *                   properties:
 *                     errors:
 *                       type: object
 *                       additionalProperties:
 *                         type: string
 *                       example:
 *                         newEmail: Invalid email
 *       400:
 *         description: Solicitud inválida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - msg
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 msg:
 *                   type: string
 *                   example: New email must be different from the current email
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - msg
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 msg:
 *                   type: string
 *                   example: User not found
 *       409:
 *         description: Conflicto por email ya registrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - msg
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 msg:
 *                   type: string
 *                   example: Email already registered
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - msg
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 msg:
 *                   type: string
 *                   example: Server error
 *       401:
 *         description: Access token ausente, expirado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - msg
 *                 - success
 *                 - code
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Invalid token
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: TOKEN_INVALID
 */
router.patch(
  "/me/email",
  requireToken,
  newEmailValidationRules,
  modifyEmail
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
 *
 *       Este endpoint puede responder:
 *       - 200 con un nuevo token
 *       - 401 si la cookie no existe, es inválida o el usuario no existe
 *       - 200 con `success: false` si ocurre un error interno controlado en el middleware de refresh
 *     responses:
 *       200:
 *         description: Token renovado correctamente o error interno controlado
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   required:
 *                     - token
 *                     - expiresIn
 *                     - success
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     expiresIn:
 *                       oneOf:
 *                         - type: integer
 *                         - type: string
 *                       example: 3600
 *                     success:
 *                       type: boolean
 *                       example: true
 *                 - type: object
 *                   required:
 *                     - msg
 *                     - success
 *                   properties:
 *                     msg:
 *                       type: string
 *                       example: Refresh token failed
 *                     success:
 *                       type: boolean
 *                       example: false
 *       401:
 *         description: Refresh token ausente, inválido o usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - msg
 *                 - success
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Invalid refresh token
 *                 success:
 *                   type: boolean
 *                   example: false
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
router.get("/account/confirm/:token", accountConfirm);

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
router.get("/email-change/confirm/:token", confirmEmailChange);

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
 *                 - msg
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 msg:
 *                   type: string
 *                   example: Admin access granted
 *       401:
 *         description: Access token ausente, expirado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - msg
 *                 - success
 *                 - code
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Token expired
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: TOKEN_EXPIRED
 *       403:
 *         description: Usuario autenticado sin permisos de administrador
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - msg
 *                 - success
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Admin only
 *                 success:
 *                   type: boolean
 *                   example: false
 */
router.get("/admin/check", requireToken, requireAdmin, (req, res) => {
  return res.json({
    success: true,
    msg: "Admin access granted",
  });
});

export default router;