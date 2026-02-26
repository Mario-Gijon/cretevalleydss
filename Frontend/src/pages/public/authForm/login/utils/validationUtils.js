// Fichero validationUtils.js

// Exporta la función validateForm que valida los valores del formulario.
export const validateForm = (formValues) => {
  // Crea un objeto para almacenar los errores de validación.
  const newErrors = {};

  // Validación del email
  const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(formValues.email)) {
    // Asigna un mensaje de error si la validación falla
    newErrors.email = 'Invalid email.';
  }

  // Validación de la contraseña: al menos un número, una letra y mínimo 6 caracteres.
  const passwordPattern = /^(?=.*[0-9])(?=.*[a-zA-Z]).{6,}$/
  if (!passwordPattern.test(formValues.password)) {
    // Asigna un mensaje de error si la validación falla.
    newErrors.password = '1 number, 1 letter, min 6.';
  }

  // Devuelve el objeto con los errores de validación.
  return newErrors;
};
