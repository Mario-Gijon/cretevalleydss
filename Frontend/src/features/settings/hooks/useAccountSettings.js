import { useEffect, useState } from "react";

import { useAuthContext } from "../../../context/auth/auth.context";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import {
  deleteAccount,
  logout,
  modifyEmail,
  modifyName,
  modifyUniversity,
  updatePassword,
} from "../../../services/auth.service";

import {
  validateEmail,
  validateName,
  validatePassword,
  validateUniversity,
} from "../logic/validateAccountSettingsFields";

const DEFAULT_FIELD_COLORS = Object.freeze({
  name: "secondary",
  university: "secondary",
  email: "secondary",
  password: "secondary",
});

const DEFAULT_ERRORS = Object.freeze({
  university: "",
  name: "",
  email: "",
  password: "",
  repeatPassword: "",
});

/**
 * Handles account settings state and actions while keeping visual components focused on rendering.
 * @param {Object} params
 * @param {boolean} params.open
 * @param {Function} params.setOpen
 * @returns {Object}
 */
export function useAccountSettings({ open, setOpen }) {
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { value, setIsLoggedIn, setValue } = useAuthContext();

  const [university, setUniversity] = useState(value.university);
  const [name, setName] = useState(value.name);
  const [email, setEmail] = useState(value.email);
  const [password, setPassword] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showUniversityReset, setShowUniversityReset] = useState(false);
  const [showNameReset, setShowNameReset] = useState(false);
  const [showEmailReset, setShowEmailReset] = useState(false);
  const [confirmPasswordDialogOpen, setConfirmPasswordDialogOpen] = useState(false);
  const [repeatPassword, setRepeatPassword] = useState("");
  const [loadingUniversity, setLoadingUniversity] = useState(false);
  const [loadingName, setLoadingName] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [fieldColors, setFieldColors] = useState({ ...DEFAULT_FIELD_COLORS });
  const [errors, setErrors] = useState({ ...DEFAULT_ERRORS });

  useEffect(() => {
    setShowUniversityReset(university !== value.university);
    setShowNameReset(name !== value.name);
    setShowEmailReset(email !== value.email);
  }, [email, name, university, value.email, value.name, value.university]);

  useEffect(() => {
    if (!open) {
      setUniversity(value.university);
      setName(value.name);
      setEmail(value.email);
      setPassword("");
      setFieldColors({ ...DEFAULT_FIELD_COLORS });
    }
  }, [open, value]);

  const handleClose = () => setOpen(false);

  const handleConfirmDelete = () => setConfirmOpen(true);
  const handleCancelDelete = () => setConfirmOpen(false);

  /**
   * Resets error and color state for a specific editable field.
   * @param {string} fieldName
   */
  const clearFieldFeedback = (fieldName) => {
    setFieldColors((prevColor) => ({ ...prevColor, [fieldName]: "secondary" }));
    setErrors((prevErrors) => ({ ...prevErrors, [fieldName]: "" }));
  };

  const handleUniversityChange = (newValue) => {
    setUniversity(newValue);
    clearFieldFeedback("university");
  };

  const handleNameChange = (newValue) => {
    setName(newValue);
    clearFieldFeedback("name");
  };

  const handleEmailChange = (newValue) => {
    setEmail(newValue);
    clearFieldFeedback("email");
  };

  const handlePasswordChange = (newValue) => {
    setPassword(newValue);
    clearFieldFeedback("password");
  };

  const handleDelete = async () => {
    setLoadingDelete(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await deleteAccount();

    if (response?.success) {
      setLoadingDelete(false);
      setIsLoggedIn(false);
      setConfirmOpen(false);
      return;
    }

    showSnackbarAlert(response?.message || "Error deleting account", "error");
    setLoadingDelete(false);
  };

  const handleUniversityModify = async () => {
    const error = validateUniversity(university);
    if (error) {
      setErrors((prevErrors) => ({ ...prevErrors, university: error }));
      setFieldColors((prevColor) => ({ ...prevColor, university: "error" }));
      return;
    }

    setLoadingUniversity(true);

    const response = await modifyUniversity(university);
    const success = Boolean(response?.success);
    const message = response?.message || "Error updating university";

    if (success) {
      setLoadingUniversity(false);

      setValue((prevValue) => ({
        ...prevValue,
        university,
      }));
      setErrors((prevErrors) => ({ ...prevErrors, university: "" }));
      setFieldColors((prevColor) => ({ ...prevColor, university: "success" }));
      showSnackbarAlert(message, "success");
      return;
    }

    setLoadingUniversity(false);
    setErrors((prevErrors) => ({ ...prevErrors, university: message }));
    setFieldColors((prevColor) => ({ ...prevColor, university: "error" }));
  };

  const handleNameModify = async () => {
    const error = validateName(name);
    if (error) {
      setErrors((prevErrors) => ({ ...prevErrors, name: error }));
      setFieldColors((prevColor) => ({ ...prevColor, name: "error" }));
      return;
    }

    setLoadingName(true);

    const response = await modifyName(name);
    const success = Boolean(response?.success);
    const message = response?.message || "Error updating name";

    if (success) {
      setLoadingName(false);

      setValue((prevValue) => ({
        ...prevValue,
        name,
      }));
      setErrors((prevErrors) => ({ ...prevErrors, name: "" }));
      setFieldColors((prevColor) => ({ ...prevColor, name: "success" }));
      showSnackbarAlert(message, "success");
      return;
    }

    setLoadingName(false);
    setErrors((prevErrors) => ({ ...prevErrors, name: message }));
    setFieldColors((prevColor) => ({ ...prevColor, name: "error" }));
  };

  const handleEmailModify = async () => {
    const error = validateEmail(email);
    if (error) {
      setErrors((prevErrors) => ({ ...prevErrors, email: error }));
      setFieldColors((prevColor) => ({ ...prevColor, email: "error" }));
      return;
    }

    setLoadingEmail(true);

    const response = await modifyEmail(email);
    const success = Boolean(response?.success);
    const message = response?.message || "Error updating email";

    if (success) {
      setLoadingEmail(false);

      setValue((prevValue) => ({
        ...prevValue,
        email,
      }));
      setErrors((prevErrors) => ({ ...prevErrors, email: "" }));
      setFieldColors((prevColor) => ({ ...prevColor, email: "success" }));
      showSnackbarAlert(message, "success");
      return;
    }

    setLoadingEmail(false);
    setErrors((prevErrors) => ({ ...prevErrors, email: message }));
    setFieldColors((prevColor) => ({ ...prevColor, email: "error" }));
  };

  const handlePasswordModify = () => {
    const passwordError = validatePassword(password);
    if (passwordError) {
      setErrors((prevErrors) => ({ ...prevErrors, password: passwordError }));
      setFieldColors((prevColor) => ({ ...prevColor, password: "error" }));
      return;
    }

    setErrors((prevErrors) => ({ ...prevErrors, password: "" }));
    setFieldColors((prevColor) => ({ ...prevColor, password: "success" }));
    setConfirmPasswordDialogOpen(true);
  };

  const handleRepeatPassword = async () => {
    if (password === repeatPassword) {
      setLoadingPassword(true);

      const response = await updatePassword(password, repeatPassword);
      const success = Boolean(response?.success);
      const message = response?.message || "Error updating password";
      if (success) {
        setLoadingPassword(false);
        showSnackbarAlert("Password updated successfully!", "success");
        setConfirmPasswordDialogOpen(false);
        setPassword("");
        setRepeatPassword("");
        setFieldColors((prevColor) => ({ ...prevColor, password: "secondary" }));

        setBackdropOpen(true);

        const countdownInterval = setInterval(() => {
          setCountdown((prevCountdown) => {
            const newCountdown = prevCountdown - 1;
            if (newCountdown <= 0) {
              clearInterval(countdownInterval);
              setBackdropOpen(false);
              logout();
              setIsLoggedIn(false);
            }
            return newCountdown;
          });
        }, 1000);

        setCountdown(3);
      } else {
        setLoadingPassword(false);
        showSnackbarAlert(message, "error");
        setConfirmPasswordDialogOpen(false);
        setPassword("");
        setRepeatPassword("");
        setFieldColors((prevColor) => ({ ...prevColor, password: "secondary" }));
      }
      return;
    }

    setLoadingPassword(false);
    setErrors((prevErrors) => ({
      ...prevErrors,
      repeatPassword: "Passwords do not match",
    }));
    setFieldColors((prevColor) => ({ ...prevColor, repeatPassword: "error" }));
  };

  const handleCancelPasswordDialog = () => {
    setConfirmPasswordDialogOpen(false);
    setPassword("");
    setRepeatPassword("");
    setErrors((prevErrors) => ({ ...prevErrors, repeatPassword: "" }));
    setFieldColors((prevColors) => ({ ...prevColors, password: "secondary" }));
  };

  const handleRepeatPasswordChange = (newValue) => {
    setRepeatPassword(newValue);
    setErrors((prevErrors) => ({ ...prevErrors, repeatPassword: "" }));
  };

  return {
    value,
    university,
    name,
    email,
    password,
    confirmOpen,
    showUniversityReset,
    showNameReset,
    showEmailReset,
    confirmPasswordDialogOpen,
    repeatPassword,
    loadingUniversity,
    loadingName,
    loadingPassword,
    loadingEmail,
    loadingDelete,
    backdropOpen,
    countdown,
    fieldColors,
    errors,
    handleClose,
    handleConfirmDelete,
    handleCancelDelete,
    handleUniversityChange,
    handleNameChange,
    handleEmailChange,
    handlePasswordChange,
    handleDelete,
    handleUniversityModify,
    handleNameModify,
    handleEmailModify,
    handlePasswordModify,
    handleRepeatPassword,
    handleCancelPasswordDialog,
    handleRepeatPasswordChange,
    setBackdropOpen,
  };
}
