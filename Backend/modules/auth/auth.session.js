import { User } from "../../models/Users.js";
import { generateToken } from "../../services/token.service.js";
import { createBadRequestError } from "../../utils/common/errors.js";
/**
 * @typedef {Object} LoginUserResult
 * @property {string|Object} userId Id del usuario autenticado.
 * @property {string} msg Mensaje de resultado.
 * @property {string} token Access token generado.
 * @property {number|string} expiresIn Tiempo de expiración del access token.
 * @property {string} role Rol del usuario autenticado.
 * @property {boolean} isAdmin Indica si el usuario es administrador.
 */

/**
 * Construye un error de login asociado a un campo concreto del formulario.
 *
 * @param {string} field Campo afectado.
 * @param {string} message Mensaje de error.
 * @returns {Error}
 */
const createLoginFieldError = (field, message) => {
  const error = createBadRequestError(message);
  error.field = field;
  return error;
};

/**
 * Inicia sesión validando credenciales y devolviendo el payload de autenticación.
 *
 * La cookie de refresh token no se genera aquí porque pertenece a la capa HTTP.
 *
 * @param {Object} params Parámetros de entrada.
 * @param {string} params.email Email introducido.
 * @param {string} params.password Contraseña introducida.
 * @returns {Promise<LoginUserResult>}
 */
export const loginUserFlow = async ({ email, password }) => {
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  const rawPassword = String(password ?? "");

  if (!cleanEmail) {
    throw createLoginFieldError("email", "Email is required");
  }

  if (!rawPassword) {
    throw createLoginFieldError("password", "Password is required");
  }

  const user = await User.findOne({ email: cleanEmail });

  if (!user) {
    throw createLoginFieldError("email", "User does not exist");
  }

  if (!user.accountConfirm) {
    throw createLoginFieldError("email", "Email not verified");
  }

  const isValidPassword = await user.comparePassword(rawPassword);

  if (!isValidPassword) {
    throw createLoginFieldError("password", "Incorrect password");
  }

  const role = user.role ?? "user";
  const { token, expiresIn } = generateToken(user._id, role);

  return {
    userId: user._id,
    msg: "Login successful",
    token,
    expiresIn,
    role,
    isAdmin: role === "admin",
  };
};