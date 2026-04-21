import { createContext, useContext } from "react";

/**
 * Contexto local del feature finishedIssueDialog.
 */
export const FinishedIssueDialogContext = createContext(null);

/**
 * Devuelve el estado compartido del dialogo de issue finalizado.
 *
 * @returns {Object}
 */
export const useFinishedIssueDialogContext = () => {
  const context = useContext(FinishedIssueDialogContext);

  if (!context) {
    throw new Error(
      "useFinishedIssueDialogContext must be used within a FinishedIssueDialogProvider"
    );
  }

  return context;
};

export default FinishedIssueDialogContext;
