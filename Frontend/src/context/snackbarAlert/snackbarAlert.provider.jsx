import { useCallback, useState } from "react";

import { SnackbarAlert } from "../../components/SnackbarAlert/SnackbarAlert.jsx";
import { SnackbarAlertContext } from "./snackbarAlert.context.js";

/**
 * Proveedor de notificaciones globales mediante snackbar.
 *
 * @param {object} props Propiedades del componente.
 * @param {*} props.children Contenido hijo.
 * @returns {*}
 */
export const SnackbarAlertProvider = ({ children }) => {
  const [snackbarState, setSnackbarState] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  /**
   * Muestra una notificación global.
   *
   * @param {string} message Mensaje a mostrar.
   * @param {string} severity Nivel de severidad.
   * @returns {void}
   */
  const showSnackbarAlert = useCallback((message, severity = "info") => {
    setSnackbarState({
      open: true,
      message,
      severity,
    });
  }, []);

  /**
   * Cierra la notificación actual.
   *
   * @param {*} _event Evento original.
   * @param {string} reason Motivo del cierre.
   * @returns {void}
   */
  const handleClose = (_event, reason) => {
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