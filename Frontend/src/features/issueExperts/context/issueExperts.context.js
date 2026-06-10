import { createContext, useContext } from "react";

const IssueExpertsContext = createContext(null);

/**
 * Devuelve el contexto del flujo de expertos del issue.
 *
 * @returns {Object}
 */
export const useIssueExpertsContext = () => {
  const context = useContext(IssueExpertsContext);

  if (!context) {
    throw new Error(
      "useIssueExpertsContext must be used within IssueExpertsProvider."
    );
  }

  return context;
};

export default IssueExpertsContext;
