import { body, validationResult } from "express-validator";

const NAME_REGEX = /^[a-zA-ZÀ-ÿ ]{2,15}$/;
const TEXT_REGEX = /^[a-zA-ZÀ-ÿ ]{2,25}$/;

/**
 * Procesa los errores de validación de express-validator.
 *
 * @type {import("express").RequestHandler}
 */
const validationResultExpress = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().reduce((acc, error) => {
      acc[error.path] = error.msg;
      return acc;
    }, {});

    console.log(formattedErrors);
    return res.json({ errors: formattedErrors });
  }

  next();
};

/**
 * Reglas de validación para el registro de usuario.
 *
 * @type {Array<import("express").RequestHandler>}
 */
export const singupValidationRules = [
  body("name", "Only letters and spaces, min 2, max 25")
    .trim()
    .isLength({ min: 2, max: 25 })
    .matches(NAME_REGEX)
    .escape(),

  body("university", "Only letters and spaces, min 2, max 25")
    .trim()
    .isLength({ min: 2, max: 25 })
    .matches(TEXT_REGEX)
    .escape(),

  body("email", "Invalid email")
    .trim()
    .isEmail(),

  body("password", "1 number, 1 letter, min 6")
    .trim()
    .isLength({ min: 6 })
    .matches(/[0-9]/)
    .matches(/[a-zA-Z]/),

  body("repeatPassword", "Passwords do not match").custom(
    (value, { req }) => value === req.body.password
  ),

  validationResultExpress,
];

/**
 * Reglas de validación para el inicio de sesión.
 *
 * @type {Array<import("express").RequestHandler>}
 */
export const loginValidationRules = [
  body("email", "Invalid email")
    .trim()
    .isEmail(),

  body(
    "password",
    "Must contain at least one number, one letter, and be at least 6 characters long"
  )
    .isLength({ min: 6 })
    .matches(/[0-9]/)
    .matches(/[a-zA-Z]/),

  validationResultExpress,
];

/**
 * Reglas de validación para el cambio de contraseña.
 *
 * @type {Array<import("express").RequestHandler>}
 */
export const updatePasswordValidationRules = [
  body(
    "newPassword",
    "Password must be at least 6 characters, with at least 1 number and 1 letter"
  )
    .trim()
    .isLength({ min: 6 })
    .matches(/[0-9]/)
    .matches(/[a-zA-Z]/),

  body("repeatNewPassword", "Passwords do not match").custom(
    (value, { req }) => value === req.body.newPassword
  ),

  validationResultExpress,
];

/**
 * Reglas de validación para el cambio de universidad.
 *
 * @type {Array<import("express").RequestHandler>}
 */
export const newUniversityValidationRules = [
  body("newUniversity", "Only letters and spaces, min 2, max 25")
    .trim()
    .isLength({ min: 2, max: 25 })
    .matches(TEXT_REGEX)
    .escape(),

  validationResultExpress,
];

/**
 * Reglas de validación para el cambio de nombre.
 *
 * @type {Array<import("express").RequestHandler>}
 */
export const newNameValidationRules = [
  body("newName", "Only letters and spaces, min 2, max 25")
    .trim()
    .isLength({ min: 2, max: 25 })
    .matches(TEXT_REGEX)
    .escape(),

  validationResultExpress,
];

/**
 * Reglas de validación para el cambio de email.
 *
 * @type {Array<import("express").RequestHandler>}
 */
export const newEmailValidationRules = [
  body("newEmail", "Invalid email")
    .trim()
    .isEmail(),

  validationResultExpress,
];