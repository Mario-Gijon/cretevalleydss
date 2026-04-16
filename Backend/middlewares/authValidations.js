import { body, validationResult } from "express-validator";
import { createBadRequestError } from "../utils/common/errors.js";

const NAME_REGEX = /^[a-zA-ZÀ-ÿ ]{2,25}$/;
const TEXT_REGEX = /^[a-zA-ZÀ-ÿ ]{2,25}$/;
const PASSWORD_HAS_NUMBER_REGEX = /[0-9]/;
const PASSWORD_HAS_LETTER_REGEX = /[a-zA-Z]/;

/**
 * Construye un mapa plano de errores de validación a partir de express-validator.
 *
 * @param {Object} errors Resultado de validación de express-validator.
 * @returns {Object.<string, string>}
 */
const formatValidationErrors = (errors) => {
  return errors.array().reduce((acc, error) => {
    acc[error.path] = error.msg;
    return acc;
  }, {});
};

/**
 * Procesa los errores de validación de express-validator.
 *
 * Si existen errores, delega su serialización al errorHandler global
 * mediante un AppError tipado.
 *
 * @param {Object} req Request de Express.
 * @param {Object} res Response de Express.
 * @param {Function} next Siguiente middleware.
 * @returns {void}
 */
export const validationResultExpress = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = formatValidationErrors(errors);
    const fields = Object.keys(formattedErrors);

    return next(
      createBadRequestError("Validation failed.", {
        field: fields.length === 1 ? fields[0] : null,
        details: formattedErrors,
      })
    );
  }

  return next();
};

/**
 * Crea una regla de validación para campos de texto simples.
 *
 * @param {string} field Nombre del campo.
 * @param {string} message Mensaje de error.
 * @param {RegExp} regex Expresión regular permitida.
 * @returns {*}
 */
const createTextRule = (field, message, regex) =>
  body(field, message)
    .trim()
    .isLength({ min: 2, max: 25 })
    .matches(regex)
    .escape();

/**
 * Crea una regla de validación para emails.
 *
 * @param {string} field Nombre del campo.
 * @param {string} [message="Invalid email"] Mensaje de error.
 * @returns {*}
 */
const createEmailRule = (field, message = "Invalid email") =>
  body(field, message).trim().isEmail();

/**
 * Crea una regla de validación para contraseñas.
 *
 * @param {string} field Nombre del campo.
 * @param {string} message Mensaje de error.
 * @returns {*}
 */
const createPasswordRule = (field, message) =>
  body(field, message)
    .trim()
    .isLength({ min: 6 })
    .matches(PASSWORD_HAS_NUMBER_REGEX)
    .matches(PASSWORD_HAS_LETTER_REGEX);

/**
 * Reglas de validación para el registro de usuario.
 *
 * @type {Array}
 */
export const signupValidationRules = [
  createTextRule("name", "Only letters and spaces, min 2, max 25", NAME_REGEX),

  createTextRule(
    "university",
    "Only letters and spaces, min 2, max 25",
    TEXT_REGEX
  ),

  createEmailRule("email"),

  createPasswordRule("password", "1 number, 1 letter, min 6"),

  body("repeatPassword", "Passwords do not match").custom(
    (value, { req }) => value === req.body.password
  ),

  validationResultExpress,
];

/**
 * Alias temporal para mantener compatibilidad con imports existentes
 * escritos con el nombre antiguo.
 */
export const singupValidationRules = signupValidationRules;

/**
 * Reglas de validación para el inicio de sesión.
 *
 * @type {Array}
 */
export const loginValidationRules = [
  createEmailRule("email"),

  createPasswordRule(
    "password",
    "Must contain at least one number, one letter, and be at least 6 characters long"
  ),

  validationResultExpress,
];

/**
 * Reglas de validación para el cambio de contraseña.
 *
 * @type {Array}
 */
export const updatePasswordValidationRules = [
  createPasswordRule(
    "newPassword",
    "Password must be at least 6 characters, with at least 1 number and 1 letter"
  ),

  body("repeatNewPassword", "Passwords do not match").custom(
    (value, { req }) => value === req.body.newPassword
  ),

  validationResultExpress,
];

/**
 * Reglas de validación para el cambio de universidad.
 *
 * @type {Array}
 */
export const newUniversityValidationRules = [
  createTextRule(
    "newUniversity",
    "Only letters and spaces, min 2, max 25",
    TEXT_REGEX
  ),

  validationResultExpress,
];

/**
 * Reglas de validación para el cambio de nombre.
 *
 * @type {Array}
 */
export const newNameValidationRules = [
  createTextRule("newName", "Only letters and spaces, min 2, max 25", TEXT_REGEX),

  validationResultExpress,
];

/**
 * Reglas de validación para el cambio de email.
 *
 * @type {Array}
 */
export const newEmailValidationRules = [
  createEmailRule("newEmail"),

  validationResultExpress,
];