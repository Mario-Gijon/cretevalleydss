import { createContext, useContext } from "react";

const IssueExpertsFlowContext = createContext(null);

/**
 * Devuelve el contexto del flujo de expertos del issue.
 *
 * @returns {Object}
 */
export const useIssueExpertsFlowContext = () => {
  const context = useContext(IssueExpertsFlowContext);

  if (!context) {
    throw new Error(
      "useIssueExpertsFlowContext must be used within IssueExpertsFlowProvider."
    );
  }

  return context;
};

export default IssueExpertsFlowContext;