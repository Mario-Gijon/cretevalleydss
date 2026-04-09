import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

/**
 * Devuelve el estado y las acciones del contexto de autenticación.
 *
 * @returns {object}
 */
export const useAuthContext = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }

  return context;
};