import { CreateIssueContext } from "./createIssue.context";
import { useCreateIssue } from "../hooks/useCreateIssue";

/**
 * Provider local del feature createIssue.
 *
 * Centraliza el estado compartido del wizard y lo expone
 * a los steps mediante contexto para reducir prop drilling.
 *
 * @param {Object} props Props del componente.
 * @param {*} props.children Contenido hijo.
 * @returns {JSX.Element}
 */
export const CreateIssueProvider = ({ children }) => {
  const createIssueState = useCreateIssue();

  return (
    <CreateIssueContext.Provider value={createIssueState}>
      {children}
    </CreateIssueContext.Provider>
  );
};

export default CreateIssueProvider;
