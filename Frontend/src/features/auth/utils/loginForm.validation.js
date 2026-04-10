/**
 * Valida los campos del formulario de inicio de sesión.
 *
 * @param {object} formValues
 * @returns {object}
 */
export const validateLoginForm = (formValues) => {
  const newErrors = {};

  const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(formValues.email)) {
    newErrors.email = "Invalid email.";
  }

  const passwordPattern = /^(?=.*[0-9])(?=.*[a-zA-Z]).{6,}$/;
  if (!passwordPattern.test(formValues.password)) {
    newErrors.password = "1 number, 1 letter, min 6.";
  }

  return newErrors;
};