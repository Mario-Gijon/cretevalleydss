// src/context/SnackbarContext.jsx
import { useState, useCallback } from "react";
import { SnackbarAlert } from "../../components/SnackbarAlert/SnackbarAlert";
import { SnackbarAlertContext } from "./snackbarAlert.context";

export const SnackbarAlertProvider = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("info");

  const showSnackbarAlert = useCallback((msg, sev = "info") => {
    setMessage(msg);
    setSeverity(sev);
    setOpen(true);
  }, []);

  const handleClose = (_, reason) => {
    if (reason === "clickaway") return;
    setOpen(false);
  };

  return (
    <SnackbarAlertContext.Provider value={{ showSnackbarAlert }}>
      {children}
      <SnackbarAlert
        open={open}
        onClose={handleClose}
        message={message}
        severity={severity}
      />
    </SnackbarAlertContext.Provider>
  );
};
