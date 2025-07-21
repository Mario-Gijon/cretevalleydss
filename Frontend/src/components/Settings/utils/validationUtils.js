// validationUtils.js

// Validación para el nombre de usuario
export const validateUniversity = (university) => {
  // Validación de universidad: no debe contener números, min 2, máximo 25 letras, y permitir espacios
  if (!/^[a-zA-ZÀ-ÿ ]{2,25}$/.test(university)) {
    return 'Only letters and spaces, min 2, max 25.'; // Error de validación original
  }
  return ''; // Sin error
};

// Validación para el nombre
export const validateName = (name) => {
  // Validación del nombre: no debe contener números, min 2, máximo 25 letras, y permitir espacios
  if (!/^[a-zA-ZÀ-ÿ ]{2,25}$/.test(name)) {
    return 'Only letters and spaces, min 2, max 25.'; // Error de validación original
  }
  return ''; // Sin error
};

// Validación para el correo electrónico
export const validateEmail = (email) => {
  // Patrón de validación para el correo electrónico
  const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(email)) {
    return 'Invalid email.'; // Error de validación original
  }
  return ''; // Sin error
};

// Validación para la contraseña
export const validatePassword = (password) => {
  // Patrón de validación para la contraseña: al menos un número, una letra y mínimo 6 caracteres
  const passwordPattern = /^(?=.*[0-9])(?=.*[a-zA-Z]).{6,}$/;
  if (!passwordPattern.test(password)) {
    return '1 number, 1 letter, min 6.'; // Error de validación original
  }
  return ''; // Sin error
};

// Validación para confirmar la contraseña
export const validateRepeatPassword = (password, repeatPassword) => {
  if (password !== repeatPassword) {
    return 'Passwords don\'t match.'; // Error de validación original
  }
  return ''; // Sin error
};
