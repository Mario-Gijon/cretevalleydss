import { useEffect, useMemo, useState } from "react";
import { Box, Button, Stack } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import TollOutlinedIcon from "@mui/icons-material/TollOutlined";
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
import { inputSx, sectionSx } from "../../styles/weightEvaluationDialog.styles";
import AlternativeEvaluationDialogShell from "../../components/AlternativeEvaluationDialogShell";
import AlternativeEvaluationSaveDialog from "../../components/AlternativeEvaluationSaveDialog";
import AlternativeEvaluationSubmitDialog from "../../components/AlternativeEvaluationSubmitDialog";
import ManualCriteriaWeightsView from "./ManualCriteriaWeightsView";
import { buildEvaluationViewContext } from "../../context/buildEvaluationViewContext";
import { getEvaluationStructureEntryForStage } from "../../evaluationStructureRegistry";

const ManualCriteriaWeightsEvaluationDialog = ({
  issue,
  isOpen,
  setIsOpen,
  setOpenIssueDialog,
}) => {
  const theme = useTheme();
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { fetchActiveIssues } = useIssuesDataContext();

  const leafCriteria = useMemo(
    () => getLeafCriteria(issue?.criteria || []),
    [issue?.criteria]
  );
  const structureEntry = useMemo(
    () =>
      getEvaluationStructureEntryForStage({
        structureKey: "manualCriteriaWeights",
        stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
      }),
    []
  );
  const structureAdapter = structureEntry?.adapter;

  const [viewPayload, setViewPayload] = useState({ weightsByCriterion: {} });
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [openSubmitDialog, setOpenSubmitDialog] = useState(false);
  const evaluationViewContext = useMemo(
    () =>
      buildEvaluationViewContext({
        issue,
        stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
        structure: structureEntry,
        criteriaTree: issue?.criteria || [],
        leafCriteria,
        payloadValue: viewPayload,
        setPayload: setViewPayload,
        loading,
        readOnly: false,
      }),
    [issue, structureEntry, leafCriteria, viewPayload, loading]
  );

  useEffect(() => {
    if (!isOpen || !issue?.id || !structureAdapter) return;

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetchIssueEvaluation(
          issue.id,
          EVALUATION_STAGES.CRITERIA_WEIGHTING
        );
        const nextPayload = structureAdapter.fromBackendPayload({
          backendPayload: response?.data?.payload,
          evaluationViewContext,
        });
        setViewPayload(nextPayload);
        setInitialData(JSON.stringify(nextPayload));
      } catch {
        const emptyPayload = structureAdapter.buildEmptyPayload({
          evaluationViewContext,
        });
        setViewPayload(emptyPayload);
        setInitialData(JSON.stringify(emptyPayload));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, issue?.id, evaluationViewContext, structureAdapter]);

  const handleCloseRequest = () => {
    if (JSON.stringify(viewPayload) !== initialData) {
      setOpenSaveDialog(true);
      return;
    }

    setIsOpen(false);
  };

  const handleClear = () => {
    if (!structureAdapter) {
      return;
    }

    setViewPayload(
      structureAdapter.clearViewPayload({
        viewPayload,
        evaluationViewContext,
      })
    );
  };

  const handleSave = async () => {
    setLoading(true);
    setOpenSaveDialog(false);

    const payload = structureAdapter.toBackendPayload({
      viewPayload,
      evaluationViewContext,
    });
    const response = await saveIssueEvaluation(
      issue.id,
      EVALUATION_STAGES.CRITERIA_WEIGHTING,
      payload
    );

    setLoading(false);

    if (response?.success) {
      showSnackbarAlert(
        response?.message || "Evaluation draft saved successfully",
        "success"
      );
      setIsOpen(false);
      return;
    }

    showSnackbarAlert(response?.message || "Error saving evaluation draft", "error");
  };

  const handleOpenSubmit = () => {
    if (!structureAdapter) {
      return;
    }

    const validationError = structureAdapter.validateSubmit({
      viewPayload,
      evaluationViewContext,
    });
    if (validationError) {
      showSnackbarAlert(validationError, "error");
      return;
    }

    setOpenSubmitDialog(true);
  };

  const handleSubmit = async () => {
    const validationError = structureAdapter.validateSubmit({
      viewPayload,
      evaluationViewContext,
    });
    if (validationError) {
      showSnackbarAlert(validationError, "error");
      return;
    }

    setLoading(true);
    setOpenSubmitDialog(false);

    const payload = structureAdapter.toBackendPayload({
      viewPayload,
      evaluationViewContext,
    });
    const response = await submitIssueEvaluationPayload(
      issue.id,
      EVALUATION_STAGES.CRITERIA_WEIGHTING,
      payload
    );

    setLoading(false);

    if (response?.success) {
      showSnackbarAlert(
        response?.message || "Evaluation submitted successfully",
        "success"
      );
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
        icon={TollOutlinedIcon}
        title="Criteria weights"
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
              onClick={handleOpenSubmit}
            >
              Submit
            </Button>
          </>
        }
      >
        <Stack spacing={2.2} sx={{ maxWidth: 900, mx: "auto" }}>
          <Box sx={sectionSx(theme)}>
            <Box sx={{ ...inputSx(theme), p: 0 }}>
              <ManualCriteriaWeightsView
                evaluationViewContext={evaluationViewContext}
              />
            </Box>
          </Box>
        </Stack>
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

export default ManualCriteriaWeightsEvaluationDialog;
