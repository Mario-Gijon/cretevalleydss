import { useState } from "react";
import { useOutletContext } from "react-router-dom";

import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import { signup } from "../../../services/auth.service";
import {
  signupFormInitialErrors,
  signupFormInitialValues,
} from "../constants/signupForm.constants";
import { validateSignupForm } from "../logic/validateSignupForm";

/**
 * Owns the signup form state and submission workflow.
 */
export const useSignupForm = () => {
  const { navigate } = useOutletContext();
  const { showSnackbarAlert } = useSnackbarAlertContext();

  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [formValues, setFormValues] = useState(signupFormInitialValues);
  const [errors, setErrors] = useState(signupFormInitialErrors);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormValues((prevValues) => ({
      ...prevValues,
      [name]: value,
    }));
  };

  const handleRestart = () => {
    setFormValues(signupFormInitialValues);
    setErrors(signupFormInitialErrors);
  };

  const handleSignUp = async (event) => {
    event.preventDefault();

    const newErrors = validateSignupForm(formValues);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);

      const data = await signup(formValues);

      if (!data?.success) {
        const validationErrors = data?.error?.details;

        if (
          validationErrors &&
          typeof validationErrors === "object" &&
          !Array.isArray(validationErrors)
        ) {
          setErrors(validationErrors);
        }

        showSnackbarAlert(data?.message || "Error signing up", "error");
        return;
      }

      setErrors(signupFormInitialErrors);
      showSnackbarAlert(
        "Signup successfully, check your email for confirmation",
        "success"
      );
      navigate("/login");
    } catch (error) {
      console.error("Error submitting signup form:", error);
      showSnackbarAlert("An error occurred while submitting the form", "error");
    } finally {
      setLoading(false);
    }
  };

  const focusNextField = (event, nextFieldId) => {
    if (event.key === "Enter") {
      document.getElementById(nextFieldId)?.focus();
    }
  };

  const handleSubmitOnEnter = (event) => {
    if (event.key === "Enter") {
      handleSignUp(event);
    }
  };

  const handleNavigateToLogin = () => navigate("/login");
  const togglePasswordVisibility = () => {
    setShowPassword((previous) => !previous);
  };
  const toggleRepeatPasswordVisibility = () => {
    setShowRepeatPassword((previous) => !previous);
  };

  return {
    errors,
    formValues,
    loading,
    showPassword,
    showRepeatPassword,
    focusNextField,
    handleChange,
    handleNavigateToLogin,
    handleRestart,
    handleSignUp,
    handleSubmitOnEnter,
    togglePasswordVisibility,
    toggleRepeatPasswordVisibility,
  };
};

export default useSignupForm;
