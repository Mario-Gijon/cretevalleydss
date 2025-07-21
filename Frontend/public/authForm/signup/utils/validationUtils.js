// Fichero validationUtils.js

// Exporta la función validateForm que valida los valores del formulario
export const validateForm = (formValues) => {
  // Objeto para almacenar los nuevos errores
  const newErrors = {};

  // Validación del nombre: no debe contener números, min 2, máximo 15 letras, y permitir espacios
  if (!/^[a-zA-ZÀ-ÿ ]{2,25}$/.test(formValues.name)) {
    // Asigna un mensaje de error si la validación falla
    newErrors.name = 'Only letters and spaces, min 2, max 25.';
  }

  // Validación del nombre: no debe contener números, min 2, máximo 15 letras, y permitir espacios
  if (!/^[a-zA-ZÀ-ÿ ]{2,25}$/.test(formValues.university)) {
    // Asigna un mensaje de error si la validación falla
    newErrors.university = 'Only letters and spaces, min 2, max 25.';
  }

  // Validación del email
  const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(formValues.email)) {
    // Asigna un mensaje de error si la validación falla
    newErrors.email = 'Invalid email.';
  }

  // Validación de la contraseña: al menos un número, una letra y mínimo 6 caracteres
  const passwordPattern = /^(?=.*[0-9])(?=.*[a-zA-Z]).{6,}$/
  if (!passwordPattern.test(formValues.password)) {
    // Asigna un mensaje de error si la validación falla
    newErrors.password = '1 number, 1 letter, min 6.';
  }

  // Validación de confirmación de contraseña
  if (formValues.password !== formValues.repeatPassword) {
    // Asigna un mensaje de error si las contraseñas no coinciden
    newErrors.repeatPassword = 'Passwords don\'t match.';
  }

  // Retorna el objeto con los errores
  return newErrors;
};
