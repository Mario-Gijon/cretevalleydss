// Importa las funciones necesarias de 'express-validator' para realizar validaciones.
import { body, validationResult } from 'express-validator';

// Función para manejar los errores de validación.
const validationResultExpress = (req, res, next) => {
  // Extrae los errores del objeto de solicitud utilizando validationResult.
  const errors = validationResult(req);

  // Si hay errores, formatearlos y enviarlos como respuesta.
  if (!errors.isEmpty()) {
    // Reduce el array de errores a un objeto con claves y mensajes de error.
    const formattedErrors = errors.array().reduce((acc, error) => {
      acc[error.path] = error.msg;
      return acc;
    }, {});

    // Imprime los errores formateados en la consola para depuración.
    console.log(formattedErrors);

    // Responde con los errores formateados como un objeto JSON.
    return res.json({ errors: formattedErrors });
  }

  // Si no hay errores, pasa al siguiente middleware.
  next();
};

// Exporta las reglas de validación para el registro de usuarios.
export const singupValidationRules = [
  // Valida que el campo 'name' tenga al menos 2 letras, max 25 caracteres y escape caracteres especiales.
  body('name', "Only letters and spaces, min 2, max 25")
    .trim() // Elimina espacios en blanco al inicio y al final del valor.
    .isLength({ min: 2, max: 25 }) // Comprueba que el valor tenga una longitud mínima de 2 y máxima de 25.
    .matches(/^[a-zA-ZÀ-ÿ ]{2,15}$/) // Solo permite letras y hasta 25 caracteres
    .escape(), // Escapa caracteres especiales para prevenir ataques XSS.

  // Valida que el campo 'university' tenga al menos 2 letras, max 25 caracteres y escape caracteres especiales.
  body('university', "Only letters and spaces, min 2, max 25")
    .trim() // Elimina espacios en blanco al inicio y al final del valor.
    .isLength({ min: 2, max: 25 }) // Comprueba que el valor tenga una longitud mínima de 2 y máxima de 25.
    .matches(/^[a-zA-ZÀ-ÿ ]{2,25}$/) // Solo permite letras y hasta 25 caracteres
    .escape(), // Escapa caracteres especiales para prevenir ataques XSS.

  // Valida que el campo 'email' sea una dirección de correo válida.
  body('email', "Invalid email")
    .trim() // Elimina espacios en blanco al inicio y al final del valor.
    //.normalizeEmail() // Normaliza la dirección de correo eliminando caracteres innecesarios.
    .isEmail(), // Verifica que el valor sea un correo válido.

  // Valida que el campo 'password' tenga al menos 6 caracteres, incluyendo letras y números.
  body('password', "1 number, 1 letter, min 6")
    .trim() // Elimina espacios en blanco al inicio y al final del valor.
    .isLength({ min: 6 }) // Comprueba que el valor tenga al menos 6 caracteres.
    .matches(/[0-9]/) // Verifica que contenga al menos un número.
    .matches(/[a-zA-Z]/), // Verifica que contenga al menos una letra.

  // Valida que el campo 'repeatPassword' coincida con el valor de 'password'.
  body('repeatPassword', "Passwords do not match")
    .custom((value, { req }) => value === req.body.password), // Comprueba que los valores coincidan.

  // Agrega la función de validación para manejar los errores.
  validationResultExpress
];

// Exporta las reglas de validación para el inicio de sesión de usuarios.
export const loginValidationRules = [
  // Valida que el campo 'email' sea una dirección de correo válida.
  body('email', "Invalid email")
    .trim() // Elimina espacios en blanco al inicio y al final del valor.
    //.normalizeEmail() // Normaliza la dirección de correo eliminando caracteres innecesarios.
    .isEmail(), // Verifica que el valor sea un correo válido.

  // Valida que el campo 'password' tenga al menos 6 caracteres, incluyendo letras y números.
  body('password', "Must contain at least one number, one letter, and be at least 6 characters long")
    .isLength({ min: 6 }) // Comprueba que el valor tenga al menos 6 caracteres.
    .matches(/[0-9]/) // Verifica que contenga al menos un número.
    .matches(/[a-zA-Z]/), // Verifica que contenga al menos una letra.

  // Agrega la función de validación para manejar los errores.
  validationResultExpress
];

// Método para validar la nueva contraseña y su confirmación
export const updatePasswordValidationRules = [
  // Valida que 'newPassword' tenga al menos 6 caracteres, incluyendo letras y números.
  body('newPassword', "Password must be at least 6 characters, with at least 1 number and 1 letter")
    .trim() // Elimina espacios en blanco al inicio y al final del valor.
    .isLength({ min: 6 }) // Comprueba que el valor tenga al menos 6 caracteres.
    .matches(/[0-9]/) // Verifica que contenga al menos un número.
    .matches(/[a-zA-Z]/), // Verifica que contenga al menos una letra.

  // Valida que 'repeatNewPassword' coincida con 'newPassword'.
  body('repeatNewPassword', "Passwords do not match")
    .custom((value, { req }) => value === req.body.newPassword), // Compara que las contraseñas coincidan.

  // Agrega la función de validación para manejar los errores.
  validationResultExpress,
];

// Método para validar el nuevo university y su confirmación
export const newUniversityValidationRules = [
  // Valida que el campo 'newName' tenga al menos 2 letras, max 25 caracteres y escape caracteres especiales.
  body('newUniversity', "Only letters and spaces, min 2, max 25")
    .trim() // Elimina espacios en blanco al inicio y al final del valor.
    .isLength({ min: 2, max: 25 }) // Comprueba que el valor tenga una longitud mínima de 2 y máxima de 25.
    .matches(/^[a-zA-ZÀ-ÿ ]{2,25}$/) // Solo permite letras y hasta 25 caracteres
    .escape(), // Escapa caracteres especiales para prevenir ataques XSS.

  // Agrega la función de validación para manejar los errores.
  validationResultExpress,
];


// Método para validar el nuevo name y su confirmación
export const newNameValidationRules = [
  // Valida que el campo 'newName' tenga al menos 2 letras, max 25 caracteres y escape caracteres especiales.
  body('newName', "Only letters and spaces, min 2, max 25")
    .trim() // Elimina espacios en blanco al inicio y al final del valor.
    .isLength({ min: 2, max: 25 }) // Comprueba que el valor tenga una longitud mínima de 2 y máxima de 25.
    .matches(/^[a-zA-ZÀ-ÿ ]{2,25}$/) // Solo permite letras y hasta 25 caracteres
    .escape(), // Escapa caracteres especiales para prevenir ataques XSS.

  // Agrega la función de validación para manejar los errores.
  validationResultExpress,
];

export const newEmailValidationRules = [
  // Valida que el campo 'email' sea una dirección de correo válida.
  body('newEmail', "Invalid email")
    .trim() // Elimina espacios en blanco al inicio y al final del valor.
    //.normalizeEmail() // Normaliza la dirección de correo eliminando caracteres innecesarios.
    .isEmail(), // Verifica que el valor sea un correo válido.

  // Agrega la función de validación para manejar los errores.
  validationResultExpress,
];