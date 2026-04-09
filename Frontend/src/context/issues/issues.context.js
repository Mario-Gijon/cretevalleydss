import { createContext, useContext } from "react";

export const IssuesDataContext = createContext(null);

/**
 * Devuelve el estado y las acciones del contexto de issues.
 *
 * @returns {object}
 */
export const useIssuesDataContext = () => {
  const context = useContext(IssuesDataContext);

  if (!context) {
    throw new Error("useIssuesDataContext must be used within an IssuesDataProvider");
  }

  return context;
};