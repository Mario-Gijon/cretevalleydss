import { useState } from "react";
import { useOutletContext } from "react-router-dom";

import { useAuthContext } from "../../../context/auth/auth.context";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import { login } from "../../../services/auth.service";
import {
  loginFormInitialErrors,
  loginFormInitialValues,
} from "../constants/loginForm.constants";
import { validateLoginForm } from "../logic/validateLoginForm";

/**
 * Owns the login form state and submission workflow.
 *
 * Keeping authentication side effects here lets the form component remain a
 * visual description of the existing login experience.
 */
export const useLoginForm = () => {
  const { navigate } = useOutletContext();
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { setIsLoggedIn } = useAuthContext();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formValues, setFormValues] = useState(loginFormInitialValues);
  const [errors, setErrors] = useState(loginFormInitialErrors);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormValues((prevValues) => ({
      ...prevValues,
      [name]: value,
    }));
  };

  const handleRestart = () => {
    setFormValues(loginFormInitialValues);
    setErrors(loginFormInitialErrors);
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    const newErrors = validateLoginForm(formValues);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);

      const data = await login(formValues);

      if (!data?.success) {
        const validationErrors = data?.error?.details;

        if (
          validationErrors &&
          typeof validationErrors === "object" &&
          !Array.isArray(validationErrors)
        ) {
          setErrors(validationErrors);
        }

        showSnackbarAlert(data?.message || "Invalid credentials", "error");
        return;
      }

      setErrors(loginFormInitialErrors);
      showSnackbarAlert("Logged in successfully!", "success");
      setIsLoggedIn(true);
      window.location.reload();
    } catch (error) {
      console.error("Error submitting login form:", error);
      showSnackbarAlert("An error occurred while submitting the form", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailKeyDown = (event) => {
    if (event.key === "Enter") {
      document.getElementById("password")?.focus();
    }
  };

  const handlePasswordKeyDown = (event) => {
    if (event.key === "Enter") {
      handleLogin(event);
    }
  };

  const handleNavigateToSignup = () => navigate("/signup");
  const togglePasswordVisibility = () => {
    setShowPassword((previous) => !previous);
  };

  return {
    errors,
    formValues,
    loading,
    showPassword,
    handleChange,
    handleEmailKeyDown,
    handleLogin,
    handleNavigateToSignup,
    handlePasswordKeyDown,
    handleRestart,
    togglePasswordVisibility,
  };
};

export default useLoginForm;
