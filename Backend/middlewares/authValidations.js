import { body, validationResult } from "express-validator";
import { createBadRequestError } from "../utils/common/errors.js";

const NAME_REGEX = /^[a-zA-ZÀ-ÿ ]{2,25}$/;
const TEXT_REGEX = /^[a-zA-ZÀ-ÿ ]{2,25}$/;
const PASSWORD_HAS_NUMBER_REGEX = /[0-9]/;
const PASSWORD_HAS_LETTER_REGEX = /[a-zA-Z]/;

const formatValidationErrors = (errors) => {
  return errors.array().reduce((acc, error) => {
    acc[error.path] = error.msg;
    return acc;
  }, {});
};

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

const createTextRule = (field, message, regex) =>
  body(field, message)
    .trim()
    .isLength({ min: 2, max: 25 })
    .matches(regex)
    .escape();

const createEmailRule = (field, message = "Invalid email") =>
  body(field, message).trim().isEmail();

const createPasswordRule = (field, message) =>
  body(field, message)
    .trim()
    .isLength({ min: 6 })
    .matches(PASSWORD_HAS_NUMBER_REGEX)
    .matches(PASSWORD_HAS_LETTER_REGEX);

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

export const singupValidationRules = signupValidationRules;

export const loginValidationRules = [
  createEmailRule("email"),

  createPasswordRule(
    "password",
    "Must contain at least one number, one letter, and be at least 6 characters long"
  ),

  validationResultExpress,
];

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

export const newUniversityValidationRules = [
  createTextRule(
    "newUniversity",
    "Only letters and spaces, min 2, max 25",
    TEXT_REGEX
  ),

  validationResultExpress,
];

export const newNameValidationRules = [
  createTextRule("newName", "Only letters and spaces, min 2, max 25", TEXT_REGEX),

  validationResultExpress,
];

export const newEmailValidationRules = [
  createEmailRule("newEmail"),

  validationResultExpress,
];