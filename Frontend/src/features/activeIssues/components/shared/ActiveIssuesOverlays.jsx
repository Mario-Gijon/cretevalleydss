import { Backdrop } from "@mui/material";

import { CircularLoading } from "../../../../components/LoadingProgress/CircularLoading";
import IssueDetailsDrawer from "../drawer/shell/IssueDetailsDrawer";
import ActiveIssueConfirmDialog from "../dialogs/ActiveIssueConfirmDialog";
import IssueExpertsDialogs from "../../../issueExperts/components/IssueExpertsDialogs.jsx";
import EvaluationDialogHost from "../../../issueEvaluation/components/EvaluationDialogHost.jsx";
import { EVALUATION_STAGES } from "../../../issueEvaluation/evaluation.constants.js";

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
  setIsRatingAlternatives,
  setIsRatingWeights,
  setDrawerOpen,
  isRatingAlternatives,
  isRatingWeights,
  confirm,
  closeConfirm,
  runConfirm,
}) => {
  return (
    <>
      <Backdrop
        open={
          busy.resolve ||
          busy.compute ||
          busy.remove ||
          busy.leave ||
          busy.editExperts
        }
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
        setIsRatingAlternatives={setIsRatingAlternatives}
        setIsRatingWeights={setIsRatingWeights}
      />

      <EvaluationDialogHost
        issue={selectedIssue}
        stage={EVALUATION_STAGES.ALTERNATIVE_EVALUATION}
        isOpen={isRatingAlternatives}
        setIsOpen={setIsRatingAlternatives}
        setOpenIssueDialog={setDrawerOpen}
      />

      <EvaluationDialogHost
        issue={selectedIssue}
        stage={EVALUATION_STAGES.CRITERIA_WEIGHTING}
        isOpen={isRatingWeights}
        setIsOpen={setIsRatingWeights}
        setOpenIssueDialog={setDrawerOpen}
      />

      <ActiveIssueConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        confirmText={confirm.confirmText}
        tone={confirm.tone}
        onClose={closeConfirm}
        onConfirm={runConfirm}
      />

      <IssueExpertsDialogs />
    </>
  );
};

export default ActiveIssuesOverlays;
