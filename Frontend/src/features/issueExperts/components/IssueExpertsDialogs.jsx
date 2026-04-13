import AddExpertsPickerDialog from "../dialogs/AddExpertsPickerDialog.jsx";
import AddExpertsDomainsDialog from "../dialogs/AddExpertsDomainsDialog.jsx";
import { useIssueExpertsFlowContext } from "../context/issueExpertsFlow.context.js";

/**
 * Agrupa los diálogos propios del flujo de expertos.
 *
 * @returns {JSX.Element}
 */
const IssueExpertsDialogs = () => {
  const {
    selectedIssue,
    openAddExpertsDialog,
    openAssignDomainsDialog,
    availableExperts,
    expertsToAdd,
    setExpertsToAdd,
    setOpenAddExpertsDialog,
    setOpenAssignDomainsDialog,
    handleConfirmDomains,
  } = useIssueExpertsFlowContext();

  return (
    <>
      <AddExpertsPickerDialog
        open={openAddExpertsDialog}
        onClose={() => setOpenAddExpertsDialog(false)}
        availableExperts={availableExperts}
        expertsToAdd={expertsToAdd}
        setExpertsToAdd={setExpertsToAdd}
      />

      <AddExpertsDomainsDialog
        open={openAssignDomainsDialog}
        onClose={() => setOpenAssignDomainsDialog(false)}
        issue={selectedIssue}
        expertsToAdd={expertsToAdd}
        onConfirmDomains={handleConfirmDomains}
      />
    </>
  );
};

export default IssueExpertsDialogs;