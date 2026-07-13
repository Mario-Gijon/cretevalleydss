import AddExpertsPickerDialog from "./AddExpertsPickerDialog.jsx";
import { useIssueExpertsContext } from "../context/issueExperts.context.js";

/**
 * Agrupa los diálogos propios del flujo de expertos.
 *
 * @returns {JSX.Element}
 */
const IssueExpertsDialogs = () => {
  const {
    openAddExpertsDialog,
    availableExperts,
    expertsToAdd,
    setExpertsToAdd,
    setOpenAddExpertsDialog,
  } = useIssueExpertsContext();

  return (
    <>
      <AddExpertsPickerDialog
        open={openAddExpertsDialog}
        onClose={() => setOpenAddExpertsDialog(false)}
        availableExperts={availableExperts}
        expertsToAdd={expertsToAdd}
        setExpertsToAdd={setExpertsToAdd}
      />
    </>
  );
};

export default IssueExpertsDialogs;
