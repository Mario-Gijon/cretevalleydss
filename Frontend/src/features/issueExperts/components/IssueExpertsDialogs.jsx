import AddExpertsPickerDialog from "./AddExpertsPickerDialog.jsx";
import ExpertWeightsDialog from "./ExpertWeightsDialog.jsx";
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
    openExpertWeightsDialog,
    setOpenExpertWeightsDialog,
    expertParticipants,
    currentExpertWeightsByEmail,
    confirmExpertWeights,
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

      <ExpertWeightsDialog
        open={openExpertWeightsDialog}
        onClose={() => setOpenExpertWeightsDialog(false)}
        experts={expertParticipants}
        currentExpertWeightsByEmail={currentExpertWeightsByEmail}
        onConfirm={confirmExpertWeights}
      />
    </>
  );
};

export default IssueExpertsDialogs;
