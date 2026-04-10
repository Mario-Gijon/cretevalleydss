import { Backdrop } from "@mui/material";

import { CircularLoading } from "../../../../components/LoadingProgress/CircularLoading";
import AddExpertsDomainsDialog from "../../../../components/AddExpertsDomainsDialog/AddExpertsDomainsDialog";
import { RateBwmWeightsDialog } from "../../../../components/RateBwmWeightsDialog/RateBwmWeightsDialog";
import { RateConsensusWeightsDialog } from "../../../../components/RateConsensusWeightsDialog/RateConsensusWeightsDialog";
import IssueDetailsDrawer from "../../drawer/components/shell/IssueDetailsDrawer";
import ActiveIssueConfirmDialog from "../dialogs/ActiveIssueConfirmDialog";
import AddExpertsPickerDialog from "../dialogs/AddExpertsPickerDialog";

/**
 * Agrupa overlays y diálogos de la pantalla de issues activos.
 *
 * @param {Object} props Props del componente.
 * @returns {JSX.Element}
 */
const ActiveIssuesOverlays = ({
  busy,
  drawerOpen,
  closeDrawer,
  minimizeDrawerOnly,
  selectedIssue,
  isMobile,
  drawerTab,
  setDrawerTab,
  openConfirm,
  handleLeaveIssue,
  handleComputeWeights,
  handleResolveIssue,
  handleRemoveIssue,
  isEditingExperts,
  toggleEditExperts,
  expertsToRemove,
  markRemoveExpert,
  expertsToAdd,
  setOpenAddExpertsDialog,
  saveExpertsChanges,
  setIsRatingAlternatives,
  setIsRatingWeights,
  EvaluationDialogComponent,
  setDrawerOpen,
  isRatingAlternatives,
  isRatingWeights,
  confirm,
  closeConfirm,
  runConfirm,
  openAddExpertsDialog,
  availableExperts,
  setExpertsToAdd,
  openAssignDomainsDialog,
  setOpenAssignDomainsDialog,
  handleConfirmDomains,
}) => {
  return (
    <>
      <Backdrop
        open={busy.resolve || busy.compute || busy.remove || busy.leave || busy.editExperts}
        sx={{ zIndex: 999999 }}
      >
        <CircularLoading color="secondary" size={50} height="50vh" />
      </Backdrop>

      <IssueDetailsDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        onMinimize={minimizeDrawerOnly}
        selectedIssue={selectedIssue}
        isMobile={isMobile}
        drawerTab={drawerTab}
        setDrawerTab={setDrawerTab}
        busy={busy}
        openConfirm={openConfirm}
        handleLeaveIssue={handleLeaveIssue}
        handleComputeWeights={handleComputeWeights}
        handleResolveIssue={handleResolveIssue}
        handleRemoveIssue={handleRemoveIssue}
        isEditingExperts={isEditingExperts}
        toggleEditExperts={toggleEditExperts}
        expertsToRemove={expertsToRemove}
        markRemoveExpert={markRemoveExpert}
        expertsToAdd={expertsToAdd}
        setOpenAddExpertsDialog={setOpenAddExpertsDialog}
        saveExpertsChanges={saveExpertsChanges}
        setIsRatingAlternatives={setIsRatingAlternatives}
        setIsRatingWeights={setIsRatingWeights}
      />

      {selectedIssue && EvaluationDialogComponent ? (
        <EvaluationDialogComponent
          setOpenIssueDialog={setDrawerOpen}
          isRatingAlternatives={isRatingAlternatives}
          setIsRatingAlternatives={setIsRatingAlternatives}
          selectedIssue={selectedIssue}
        />
      ) : null}

      {selectedIssue?.weightingMode === "consensus" ? (
        <RateConsensusWeightsDialog
          isRatingWeights={isRatingWeights}
          setIsRatingWeights={setIsRatingWeights}
          selectedIssue={selectedIssue}
          handleCloseIssueDialog={closeDrawer}
        />
      ) : (
        <RateBwmWeightsDialog
          isRatingWeights={isRatingWeights}
          setIsRatingWeights={setIsRatingWeights}
          selectedIssue={selectedIssue}
          handleCloseIssueDialog={closeDrawer}
        />
      )}

      <ActiveIssueConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        confirmText={confirm.confirmText}
        onClose={closeConfirm}
        onConfirm={runConfirm}
      />

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

export default ActiveIssuesOverlays;