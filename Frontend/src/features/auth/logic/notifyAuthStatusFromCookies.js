import Cookies from "js-cookie";

const ACCOUNT_STATUS_MESSAGES = {
  verified: {
    message: "Account verified successfully!",
    severity: "success",
  },
  verification_failed: {
    message: "Invalid account verification",
    severity: "error",
  },
  error: {
    message: "An error occurred during account verification.",
    severity: "error",
  },
};

const EMAIL_CHANGE_STATUS_MESSAGES = {
  verified: {
    message: "Email updated successfully!",
    severity: "success",
  },
  verification_failed: {
    message: "Email verification failed. Invalid token.",
    severity: "error",
  },
  error: {
    message: "An error occurred during email verification.",
    severity: "error",
  },
};

/**
 * Muestra mensajes pendientes de verificación a partir de cookies temporales.
 *
 * @param {Function} showSnackbarAlert
 */
export const notifyAuthStatusFromCookies = (showSnackbarAlert) => {
  const accountStatus = Cookies.get("accountStatus");
  const emailChangeStatus = Cookies.get("emailChangeStatus");

  if (accountStatus && ACCOUNT_STATUS_MESSAGES[accountStatus]) {
    const { message, severity } = ACCOUNT_STATUS_MESSAGES[accountStatus];
    showSnackbarAlert(message, severity);
    Cookies.remove("accountStatus");
  }

  if (emailChangeStatus && EMAIL_CHANGE_STATUS_MESSAGES[emailChangeStatus]) {
    const { message, severity } = EMAIL_CHANGE_STATUS_MESSAGES[emailChangeStatus];
    showSnackbarAlert(message, severity);
    Cookies.remove("emailChangeStatus");
  }
};