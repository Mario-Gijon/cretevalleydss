import {
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

import { GlassDialog } from "../../../components/StyledComponents/GlassDialog.jsx";
import { getAlternativeEvaluationStructureEntry } from "../alternativeEvaluation.registry.js";

/**
 * Hosts the alternative evaluation dialog selected by the issue evaluation structure.
 *
 * @param {Object} props - Host props.
 * @param {Object|null} props.issue - Issue selected for evaluation.
 * @param {boolean} props.isOpen - Whether the evaluation dialog is open.
 * @param {Function} props.setIsOpen - Dialog open state setter.
 * @param {Function} props.setOpenIssueDialog - Issue drawer open state setter.
 * @returns {Object|null} React element.
 */
const EvaluationDialogHost = ({
  issue,
  isOpen,
  setIsOpen,
  setOpenIssueDialog,
}) => {
  if (!issue) {
    return null;
  }

  const evaluationStructure = issue?.evaluationStructure;
  const dialogEntry = getAlternativeEvaluationStructureEntry(evaluationStructure);
  const DialogComponent = dialogEntry?.Dialog || null;

  if (!DialogComponent) {
    return (
      <GlassDialog
        open={Boolean(isOpen)}
        onClose={() => setIsOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          Unsupported evaluation structure
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            This issue uses an evaluation structure that is not registered in the frontend.
          </Typography>

          {evaluationStructure ? (
            <Typography variant="body2" sx={{ mt: 1.25 }}>
              Received structure: {evaluationStructure}
            </Typography>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" color="info" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </GlassDialog>
    );
  }

  return (
    <DialogComponent
      setOpenIssueDialog={setOpenIssueDialog}
      isRatingAlternatives={isOpen}
      setIsRatingAlternatives={setIsOpen}
      selectedIssue={issue}
    />
  );
};

export default EvaluationDialogHost;
