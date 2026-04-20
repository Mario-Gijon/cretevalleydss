import { createContext, useContext } from "react";

/**
 * Contexto local del feature createIssue.
 */
export const CreateIssueContext = createContext(null);

/**
 * Devuelve el estado compartido del flujo createIssue.
 *
 * @returns {Object}
 */
export const useCreateIssueContext = () => {
  const context = useContext(CreateIssueContext);

  if (!context) {
    throw new Error("useCreateIssueContext must be used within a CreateIssueProvider");
  }

  return context;
};

export default CreateIssueContext;
