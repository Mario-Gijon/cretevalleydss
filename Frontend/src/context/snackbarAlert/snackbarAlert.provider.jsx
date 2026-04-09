import { useCallback, useState } from "react";

import { SnackbarAlert } from "../../components/SnackbarAlert/SnackbarAlert.jsx";
import { SnackbarAlertContext } from "./snackbarAlert.context.js";

/**
 * Proveedor de notificaciones globales mediante snackbar.
 *
 * @param {object} props
 * @param {*} props.children
 * @returns {*}
 */
export const SnackbarAlertProvider = ({ children }) => {
  const [snackbarState, setSnackbarState] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const showSnackbarAlert = useCallback((message, severity = "info") => {
    setSnackbarState({
      open: true,
      message,
      severity,
    });
  }, []);

  const handleClose = (_, reason) => {
    if (reason === "clickaway") {
      return;
    }

    setSnackbarState((prevState) => ({
      ...prevState,
      open: false,
    }));
  };

  return (
    <SnackbarAlertContext.Provider value={{ showSnackbarAlert }}>
      {children}
      <SnackbarAlert
        open={snackbarState.open}
        onClose={handleClose}
        message={snackbarState.message}
        severity={snackbarState.severity}
      />
    </SnackbarAlertContext.Provider>
  );
};