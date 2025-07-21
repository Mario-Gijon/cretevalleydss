// Importa las funciones para crear y consumir un contexto
import { createContext, useContext } from "react";

// Crea el contexto de autenticación con un valor inicial de null
export const SnackbarAlertContext = createContext(null);

// Hook personalizado para consumir el IssuesDataContext
export const useSnackbarAlertContext = () => {
  // Utiliza useContext para obtener el valor del contexto
  const context = useContext(SnackbarAlertContext);

  // Si el contexto es null, lanza un error, ya que debe ser usado dentro de un IssuesDataContextProvider
  if (context.value === null)
    throw new Error("SnackbarAlertContext must be used within a SnackbarAlertContextProvider");

  // Devuelve el contexto
  return context;
};
