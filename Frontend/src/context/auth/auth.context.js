// Importa las funciones para crear y consumir un contexto
import { createContext, useContext } from "react";

// Crea el contexto de autenticación con un valor inicial de null
export const AuthContext = createContext(null);

// Hook personalizado para consumir el AuthContext
export const useAuthContext = () => {
  // Utiliza useContext para obtener el valor del contexto
  const context = useContext(AuthContext);

  // Si el contexto es null, lanza un error, ya que debe ser usado dentro de un AuthContextProvider
  if (context.value === null)
    throw new Error("AuthContext must be used within a AuthContextProvider");

  // Devuelve el contexto
  return context;
};
