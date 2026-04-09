import { createContext, useContext } from "react";

export const SnackbarAlertContext = createContext(null);

/**
 * Devuelve las acciones disponibles para mostrar notificaciones globales.
 *
 * @returns {object}
 */
export const useSnackbarAlertContext = () => {
  const context = useContext(SnackbarAlertContext);

  if (!context) {
    throw new Error(
      "useSnackbarAlertContext must be used within a SnackbarAlertProvider"
    );
  }

  return context;
};