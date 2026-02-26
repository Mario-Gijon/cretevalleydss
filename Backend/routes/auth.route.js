// Importa el enrutador de Express para definir rutas.
import { Router } from 'express'
// Importa los controladores para manejar las operaciones de autenticación.
import { loginUser, signupUser, logout, deleteAccount, updatePassword, accountConfirm, infoUser, modifyUniversity, modifyName, modifyEmail, confirmEmailChange } from '../controllers/auth.controller.js'
// Importa el middleware para verificar el token de acceso.
import { requireToken } from '../middlewares/requireToken.js'
// Importa el middleware para generar un nuevo token de acceso desde un token de refresco.
import { refreshToken } from '../middlewares/refreshToken.js'
// Importa las reglas de validación para los datos de entrada en las rutas de registro y login.
import { singupValidationRules, loginValidationRules, updatePasswordValidationRules, newUniversityValidationRules, newNameValidationRules, newEmailValidationRules } from '../middlewares/authValidations.js'
// Importa el middleware para verificar la validez del token de refresco.
import { requireRefreshToken } from '../middlewares/requireRefreshToken.js'
import { requireAdmin } from '../middlewares/requireAdmin.js'

// Crea una instancia del enrutador de Express.
const router = Router()

// Define la ruta POST para el registro de usuarios.
// Aplica las reglas de validación y ejecuta el controlador `signupUser`.
router.post("/signup", singupValidationRules, signupUser)

// Define la ruta POST para el inicio de sesión de usuarios.
// Aplica las reglas de validación y ejecuta el controlador `loginUser`.
router.post("/login", loginValidationRules, loginUser)

// Define la ruta GET para cerrar sesión.
// Ejecuta el controlador `logout`.
router.get("/logout", logout)

// Define la ruta DELETE para acceder a datos protegidos.
// Aplica el middleware `requireToken` para verificar el token antes de ejecutar el controlador `deleteAccount`.
router.delete("/deleteAccount", requireToken, deleteAccount)

// Define la ruta PUT para acceder a datos protegidos.
// Aplica el middleware `requireToken` para verificar el token antes de ejecutar el controlador `updatePassword`.
router.put("/updatePassword", requireToken, updatePasswordValidationRules, updatePassword)

// Define la ruta PUT para acceder a datos protegidos.
// Aplica el middleware `requireToken` para verificar el token antes de ejecutar el controlador `modifyUniversity`.
router.put("/modifyUniversity", requireToken, newUniversityValidationRules, modifyUniversity)

// Define la ruta PUT para acceder a datos protegidos.
// Aplica el middleware `requireToken` para verificar el token antes de ejecutar el controlador `modifyName`.
router.put("/modifyName", requireToken, newNameValidationRules, modifyName)

// Define la ruta PUT para acceder a datos protegidos.
// Aplica el middleware `requireToken` para verificar el token antes de ejecutar el controlador `modifyName`.
router.put("/modifyEmail", requireToken, newEmailValidationRules, modifyEmail)

// Define la ruta GET para acceder a datos protegidos.
// Aplica el middleware `requireToken` para verificar el token antes de ejecutar el controlador `infoUser`.
router.get("/protected", requireToken, infoUser)

// Define la ruta GET para renovar el token de acceso.
// Aplica el middleware `requireRefreshToken` antes de ejecutar el middleware `refreshToken`.
router.get("/refresh", requireRefreshToken, refreshToken)

// Define la ruta GET para confirmar una cuenta mediante un token de confirmación.
// Ejecuta el controlador `accountConfirm`.
router.get("/accountConfirm/:token", accountConfirm)

// Define la ruta GET para confirmar una cuenta mediante un token de confirmación.
// Ejecuta el controlador `accountConfirm`.
router.get("/confirmEmailChange/:token", confirmEmailChange)

router.get("/admin/check", requireToken, requireAdmin, (req, res) => { return res.json({ success: true, msg: "Admin access granted" }) })

// Exporta el enrutador para que pueda ser utilizado en otros módulos.
export default router
