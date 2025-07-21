// Importa las funciones para crear y consumir un contexto
import { createContext, useContext } from "react";

// Crea el contexto de autenticación con un valor inicial de null
export const IssuesDataContext = createContext(null);

// Hook personalizado para consumir el IssuesDataContext
export const useIssuesDataContext = () => {
  // Utiliza useContext para obtener el valor del contexto
  const context = useContext(IssuesDataContext);

  // Si el contexto es null, lanza un error, ya que debe ser usado dentro de un IssuesDataContextProvider
  if (context.value === null)
    throw new Error("IssuesDataContext must be used within a IssuesDataContextProvider");

  // Devuelve el contexto
  return context;
};
