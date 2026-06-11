/**
 * Valida los campos del formulario de registro.
 *
 * @param {object} formValues
 * @returns {object}
 */
export const validateSignupForm = (formValues) => {
  const newErrors = {};

  if (!/^[a-zA-ZÀ-ÿ ]{2,25}$/.test(formValues.name)) {
    newErrors.name = "Only letters and spaces, min 2, max 25.";
  }

  if (!/^[a-zA-ZÀ-ÿ ]{2,25}$/.test(formValues.university)) {
    newErrors.university = "Only letters and spaces, min 2, max 25.";
  }

  const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(formValues.email)) {
    newErrors.email = "Invalid email.";
  }

  const passwordPattern = /^(?=.*[0-9])(?=.*[a-zA-Z]).{6,}$/;
  if (!passwordPattern.test(formValues.password)) {
    newErrors.password = "1 number, 1 letter, min 6.";
  }

  if (formValues.password !== formValues.repeatPassword) {
    newErrors.repeatPassword = "Passwords don't match.";
  }

  return newErrors;
};