import { useEffect, useMemo, useState } from "react";
import { Box, Button } from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";

import { useSnackbarAlertContext } from "../../../../context/snackbarAlert/snackbarAlert.context";
import { useIssuesDataContext } from "../../../../context/issues/issues.context";
import { getLeafCriteria } from "../../../../utils/criteria.utils";
import {
  fetchIssueEvaluation,
  saveIssueEvaluation,
  submitIssueEvaluationPayload,
} from "../../services/issueEvaluation.service";
import { EVALUATION_STAGES } from "../../evaluation.constants";
import AlternativeEvaluationDialogShell from "../../shared/components/AlternativeEvaluationDialogShell";
import AlternativeEvaluationSaveDialog from "../../shared/components/AlternativeEvaluationSaveDialog";
import AlternativeEvaluationSubmitDialog from "../../shared/components/AlternativeEvaluationSubmitDialog";
import BestWorstCriteriaView from "./BestWorstCriteriaView";
import {
  buildEmptyBestWorstCriteriaPayload,
  validateBestWorstCriteriaPayload,
} from "./bestWorstCriteria.payload";

const BestWorstCriteriaEvaluationDialog = ({ issue, isOpen, setIsOpen, setOpenIssueDialog }) => {
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { fetchActiveIssues } = useIssuesDataContext();

  const leafCriteria = useMemo(() => getLeafCriteria(issue?.criteria || []), [issue?.criteria]);
  const criterionNames = useMemo(() => leafCriteria.map((criterion) => criterion.name), [leafCriteria]);

  const [bwmPayload, setBwmPayload] = useState(
    buildEmptyBestWorstCriteriaPayload(criterionNames)
  );
  const [initialData, setInitialData] = useState(null);
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [openSubmitDialog, setOpenSubmitDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !issue?.id) return;

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetchIssueEvaluation(issue.id, EVALUATION_STAGES.CRITERIA_WEIGHTING);
        const nextPayload = response?.data?.payload;
        setBwmPayload(nextPayload);
        setInitialData(JSON.stringify(nextPayload));
      } catch {
        const empty = buildEmptyBestWorstCriteriaPayload(criterionNames);
        setBwmPayload(empty);
        setInitialData(JSON.stringify(empty));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, issue?.id, criterionNames]);

  const handleCloseRequest = () => {
    if (JSON.stringify(bwmPayload) !== initialData) {
      setOpenSaveDialog(true);
      return;
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setBwmPayload(buildEmptyBestWorstCriteriaPayload(criterionNames));
  };

  const handleSave = async () => {
    setLoading(true);
    setOpenSaveDialog(false);

    const response = await saveIssueEvaluation(
      issue.id,
      EVALUATION_STAGES.CRITERIA_WEIGHTING,
      bwmPayload
    );

    setLoading(false);

    if (response?.success) {
      showSnackbarAlert(response?.message || "Evaluation draft saved successfully", "success");
      setIsOpen(false);
      return;
    }

    showSnackbarAlert(response?.message || "Error saving evaluation draft", "error");
  };

  const handleSubmit = async () => {
    const validationError = validateBestWorstCriteriaPayload({
      criterionNames,
      payload: bwmPayload,
    });
    if (validationError) {
      showSnackbarAlert(validationError, "error");
      return;
    }

    setLoading(true);
    setOpenSubmitDialog(false);

    const response = await submitIssueEvaluationPayload(
      issue.id,
      EVALUATION_STAGES.CRITERIA_WEIGHTING,
      bwmPayload
    );

    setLoading(false);

    if (response?.success) {
      showSnackbarAlert(response?.message || "Evaluation submitted successfully", "success");
      await fetchActiveIssues();
      setOpenIssueDialog(false);
      setIsOpen(false);
      return;
    }

    showSnackbarAlert(response?.message || "Error submitting evaluation", "error");
  };

  return (
    <>
      <AlternativeEvaluationDialogShell
        open={isOpen}
        onClose={handleCloseRequest}
        loading={loading}
        maxWidth="md"
        icon={TuneIcon}
        title="BWM"
        subtitle={issue?.name || ""}
        contentSx={{ p: { xs: 1.5, sm: 2.2 } }}
        actions={
          <>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweepOutlinedIcon />}
              onClick={handleClear}
            >
              Clear all
            </Button>

            <Box sx={{ flex: 1 }} />

            <Button
              variant="outlined"
              color="success"
              startIcon={<PublishOutlinedIcon />}
              onClick={() => {
                const validationError = validateBestWorstCriteriaPayload({
                  criterionNames,
                  payload: bwmPayload,
                });
                if (validationError) {
                  showSnackbarAlert(validationError, "error");
                  return;
                }
                setOpenSubmitDialog(true);
              }}
            >
              Submit
            </Button>
          </>
        }
      >
        <BestWorstCriteriaView
          criterionNames={criterionNames}
          payload={bwmPayload}
          setPayload={setBwmPayload}
          disabled={loading}
        />
      </AlternativeEvaluationDialogShell>

      <AlternativeEvaluationSaveDialog
        open={openSaveDialog}
        onClose={() => setOpenSaveDialog(false)}
        onSave={handleSave}
        onExit={() => {
          setOpenSaveDialog(false);
          setIsOpen(false);
        }}
      />

      <AlternativeEvaluationSubmitDialog
        open={openSubmitDialog}
        onClose={() => setOpenSubmitDialog(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
};

export default BestWorstCriteriaEvaluationDialog;
