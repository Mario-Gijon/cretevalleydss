import {
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

import { GlassDialog } from "../../../components/StyledComponents/GlassDialog";
import { EVALUATION_STAGES } from "../evaluation.constants";
import { getEvaluationStructureEntryForStage } from "../evaluation.registry";

const getIssueStructureKeyByStage = (issue, stage) => {
  if (stage === EVALUATION_STAGES.CRITERIA_WEIGHTING) {
    return issue?.criteriaWeightingStructureKey || null;
  }

  if (stage === EVALUATION_STAGES.ALTERNATIVE_EVALUATION) {
    return issue?.alternativeEvaluationStructureKey || null;
  }

  return null;
};

const EvaluationDialogHost = ({ issue, stage, isOpen, setIsOpen, setOpenIssueDialog }) => {
  if (!issue || !stage) return null;

  const structureKey = getIssueStructureKeyByStage(issue, stage);
  const dialogEntry = getEvaluationStructureEntryForStage({ structureKey, stage });
  const DialogComponent = dialogEntry?.Dialog || null;

  if (!DialogComponent) {
    return (
      <GlassDialog open={Boolean(isOpen)} onClose={() => setIsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Unsupported evaluation structure</DialogTitle>

        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            This stage/structure is not registered in the frontend evaluation registry.
          </Typography>

          <Typography variant="body2" sx={{ mt: 1.25 }}>
            Stage: {String(stage)}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Structure key: {String(structureKey)}
          </Typography>
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
      issue={issue}
      stage={stage}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      setOpenIssueDialog={setOpenIssueDialog}
    />
  );
};

export default EvaluationDialogHost;
