import {
  DialogContent,
  Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import { AppDialog } from "../../../components/StyledComponents/AppDialog";
import {
  EVALUATION_STAGES,
  getEvaluationStructureEntryForStage,
} from "../../decisionPlugins/evaluations/registry";
import EvaluationStructureDialog from "./EvaluationStructureDialog";

const getIssueStructureKeyByStage = (issue, stage) => {
  if (stage === EVALUATION_STAGES.CRITERIA_WEIGHTING) {
    return issue?.criteriaWeightsStructureKey || null;
  }

  if (stage === EVALUATION_STAGES.ALTERNATIVE_EVALUATION) {
    return issue?.evaluationStructureKey || null;
  }

  return null;
};

const EvaluationDialogHost = ({ issue, stage, isOpen, setIsOpen, setOpenIssueDialog }) => {
  if (!issue || !stage) return null;

  const structureKey = getIssueStructureKeyByStage(issue, stage);
  const structureEntry = getEvaluationStructureEntryForStage({ structureKey, stage });

  if (!structureEntry) {
    return (
      <AppDialog open={Boolean(isOpen)} onClose={() => setIsOpen(false)} title="Unsupported evaluation structure" icon={<InfoOutlinedIcon />} maxWidth="sm" titleSx={{ fontWeight: 900 }}>

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

      </AppDialog>
    );
  }

  return (
    <EvaluationStructureDialog
      issue={issue}
      stage={stage}
      structureKey={structureKey}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      setOpenIssueDialog={setOpenIssueDialog}
    />
  );
};

export default EvaluationDialogHost;
