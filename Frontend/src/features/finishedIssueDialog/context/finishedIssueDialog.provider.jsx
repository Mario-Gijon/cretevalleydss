import { FinishedIssueDialogContext } from "./finishedIssueDialog.context";
import { useFinishedIssueDialogView } from "../hooks/useFinishedIssueDialogView";

/**
 * Provider local del feature finishedIssueDialog.
 *
 * Expone en contexto el estado y acciones del dialogo
 * para reducir prop drilling entre shell y secciones.
 *
 * @param {Object} props Props del componente.
 * @param {Object} props.selectedIssue Issue seleccionado.
 * @param {boolean} props.openFinishedIssueDialog Estado de apertura del dialogo.
 * @param {Function} props.handleCloseFinishedIssueDialog Handler de cierre.
 * @param {Function} props.setOpenRemoveConfirmDialog Handler para abrir borrado.
 * @param {*} props.children Contenido hijo.
 * @returns {JSX.Element}
 */
export const FinishedIssueDialogProvider = ({
  selectedIssue,
  openFinishedIssueDialog,
  handleCloseFinishedIssueDialog,
  setOpenRemoveConfirmDialog,
  children,
}) => {
  const view = useFinishedIssueDialogView({
    selectedIssue,
    openFinishedIssueDialog,
  });

  const value = {
    selectedIssue,
    openFinishedIssueDialog,
    handleCloseFinishedIssueDialog,
    setOpenRemoveConfirmDialog,
    ...view,
  };

  return (
    <FinishedIssueDialogContext.Provider value={value}>
      {children}
    </FinishedIssueDialogContext.Provider>
  );
};

export default FinishedIssueDialogProvider;
