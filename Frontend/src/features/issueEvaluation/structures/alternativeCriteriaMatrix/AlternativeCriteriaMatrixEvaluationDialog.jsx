import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";

import { useSnackbarAlertContext } from "../../../../context/snackbarAlert/snackbarAlert.context";
import { useIssuesDataContext } from "../../../../context/issues/issues.context";
import AlternativeCriteriaMatrixView from "./AlternativeCriteriaMatrixView";
import AlternativeEvaluationSaveDialog from "../../components/AlternativeEvaluationSaveDialog";
import AlternativeEvaluationSubmitDialog from "../../components/AlternativeEvaluationSubmitDialog";
import AlternativeEvaluationDialogShell from "../../components/AlternativeEvaluationDialogShell";
import { getLeafCriteria } from "../../../../utils/criteria.utils";
import { sectionSx } from "../../styles/alternativeEvaluationDialog.styles";
import { buildEvaluationViewContext } from "../../context/buildEvaluationViewContext";
import {
  fetchIssueEvaluation,
  saveIssueEvaluation,
  submitIssueEvaluationPayload,
} from "../../services/issueEvaluation.service";
import { EVALUATION_STAGES } from "../../evaluation.constants";
import { getEvaluationStructureEntryForStage } from "../../evaluationStructureRegistry";

const formatMatrixValidationError = (validationError) => {
  if (!validationError) {
    return null;
  }

  if (typeof validationError === "string") {
    return validationError;
  }

  return `Alternative: ${validationError.alternative}, Criterion: ${validationError.criterion}, ${validationError.message}`;
};

const AlternativeCriteriaMatrixEvaluationDialog = ({
  issue,
  isOpen,
  setIsOpen,
  setOpenIssueDialog,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { fetchActiveIssues } = useIssuesDataContext();

  const [evaluations, setEvaluations] = useState({});
  const [openCloseDialog, setOpenCloseDialog] = useState(false);
  const [openSubmitDialog, setOpenSubmitDialog] = useState(false);
  const [initialEvaluations, setInitialEvaluations] = useState(null);
  const [pendingSubmitEvaluations, setPendingSubmitEvaluations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [collectiveVisible, setCollectiveVisible] = useState(false);
  const [collectiveEvaluations, setCollectiveEvaluations] = useState(null);
  const matrixRef = useRef(null);
  const evaluationsRef = useRef(evaluations);

  useEffect(() => {
    evaluationsRef.current = evaluations;
  }, [evaluations]);

  const leafCriteria = useMemo(
    () => getLeafCriteria(issue?.criteria || []),
    [issue?.criteria]
  );
  const alternatives = useMemo(() => issue?.alternatives || [], [issue?.alternatives]);
  const structureEntry = useMemo(
    () =>
      getEvaluationStructureEntryForStage({
        structureKey: "alternativeCriteriaMatrix",
        stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      }),
    []
  );
  const structureAdapter = structureEntry?.adapter;
  const evaluationViewContext = useMemo(
    () =>
      buildEvaluationViewContext({
        issue,
        stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
        structure: structureEntry,
        alternatives,
        criteriaTree: issue?.criteria || [],
        leafCriteria,
        payloadValue: evaluations,
        setPayload: setEvaluations,
        collectiveValue: collectiveEvaluations || {},
        collectiveVisible,
        setCollectiveVisible,
        loading,
        readOnly: false,
      }),
    [
      issue,
      alternatives,
      structureEntry,
      leafCriteria,
      evaluations,
      collectiveEvaluations,
      collectiveVisible,
      loading,
    ]
  );

  const flushPendingGridEdit = async () => {
    if (matrixRef.current?.flushPendingEdits) {
      await matrixRef.current.flushPendingEdits();
    }
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  const getAuthoritativeEvaluations = async () => {
    await flushPendingGridEdit();
    return evaluationsRef.current;
  };

  useEffect(() => {
    if (!isOpen || !issue?.id || !structureAdapter) return;

    const fetchCurrentEvaluations = async () => {
      setLoading(true);
      try {
        const response = await fetchIssueEvaluation(
          issue.id,
          EVALUATION_STAGES.ALTERNATIVE_EVALUATION
        );
        const merged = structureAdapter.fromBackendPayload({
          backendPayload: response?.data?.payload,
          evaluationViewContext,
        });
        const resolvedCollectiveEvaluations =
          structureAdapter.resolveCollectivePayload({
            collectiveReference: response?.data?.collectiveReference || null,
            evaluationViewContext,
          });

        setEvaluations(merged);
        setCollectiveEvaluations(resolvedCollectiveEvaluations);
        setCollectiveVisible(
          Boolean(
            resolvedCollectiveEvaluations &&
              Object.keys(resolvedCollectiveEvaluations).length > 0
          )
        );
        setInitialEvaluations(JSON.stringify(merged));
      } catch {
        const emptyPayload = structureAdapter.buildEmptyPayload({
          evaluationViewContext,
        });
        setEvaluations(emptyPayload);
        setCollectiveEvaluations(null);
        setCollectiveVisible(false);
        setInitialEvaluations(JSON.stringify(emptyPayload));
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentEvaluations();
  }, [isOpen, issue?.id, evaluationViewContext, structureAdapter]);

  const handleClearAll = () => {
    if (!structureAdapter) {
      return;
    }

    setEvaluations(
      structureAdapter.clearViewPayload({
        viewPayload: evaluations,
        evaluationViewContext,
      })
    );
    showSnackbarAlert("All evaluations cleared", "success");
  };

  const handleCloseDialog = () => {
    setOpenCloseDialog(false);
    setPendingSubmitEvaluations(null);
    setIsOpen(false);
  };

  const handleConfirmChanges = () => {
    if (JSON.stringify(evaluations) === initialEvaluations) {
      handleCloseDialog();
      return;
    }
    setOpenCloseDialog(true);
  };

  const validate = (candidateEvaluations, allowEmpty) => {
    if (!structureAdapter) {
      return false;
    }

    const validationError = allowEmpty
      ? structureAdapter.validateDraft({
          viewPayload: candidateEvaluations,
          evaluationViewContext,
        })
      : structureAdapter.validateSubmit({
          viewPayload: candidateEvaluations,
          evaluationViewContext,
        });

    if (!validationError) {
      return true;
    }

    showSnackbarAlert(formatMatrixValidationError(validationError), "error");
    return false;
  };

  const handleSave = async () => {
    const nextEvaluations = await getAuthoritativeEvaluations();
    if (!validate(nextEvaluations, true) || !structureAdapter) return;

    setLoading(true);
    setOpenCloseDialog(false);

    const payload = structureAdapter.toBackendPayload({
      viewPayload: nextEvaluations,
      evaluationViewContext,
    });
    const response = await saveIssueEvaluation(
      issue.id,
      EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
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

  const handleOpenSubmit = async () => {
    const nextEvaluations = await getAuthoritativeEvaluations();
    if (!validate(nextEvaluations, false)) return;

    setPendingSubmitEvaluations(nextEvaluations);
    setOpenSubmitDialog(true);
  };

  const handleSubmit = async () => {
    setOpenSubmitDialog(false);
    setLoading(true);

    const nextEvaluations =
      pendingSubmitEvaluations ?? (await getAuthoritativeEvaluations());
    const payload = structureAdapter.toBackendPayload({
      viewPayload: nextEvaluations,
      evaluationViewContext,
    });
    const response = await submitIssueEvaluationPayload(
      issue.id,
      EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      payload
    );

    setLoading(false);
    setPendingSubmitEvaluations(null);

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
        onClose={handleConfirmChanges}
        loading={loading}
        fullScreen={isMobile}
        maxWidth="lg"
        icon={TableChartOutlinedIcon}
        title="Alternative evaluation"
        subtitle={issue?.name || ""}
        criteria={leafCriteria}
        showExpressionDomains
        showCollectiveControl={
          Boolean(
            collectiveEvaluations && Object.keys(collectiveEvaluations).length > 0
          )
        }
        collectiveVisible={collectiveVisible}
        onToggleCollective={() => setCollectiveVisible((value) => !value)}
        contentSx={{ p: { xs: 1.5, sm: 2.2 } }}
        actions={
          <>
            <Button
              variant="outlined"
              color="error"
              onClick={handleClearAll}
              startIcon={<DeleteSweepOutlinedIcon />}
            >
              Clear all
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button
              variant="outlined"
              color="success"
              onClick={handleOpenSubmit}
              startIcon={<PublishOutlinedIcon />}
            >
              Submit
            </Button>
          </>
        }
      >
        <Box
          sx={{
            ...sectionSx(theme),
            maxWidth: 1400,
            mx: "auto",
            p: { xs: 1, sm: 1.5 },
          }}
        >
          {issue && !loading && (
            <AlternativeCriteriaMatrixView
              ref={matrixRef}
              evaluationViewContext={evaluationViewContext}
            />
          )}
        </Box>
      </AlternativeEvaluationDialogShell>

      <AlternativeEvaluationSaveDialog
        open={openCloseDialog}
        onClose={() => setOpenCloseDialog(false)}
        onSave={handleSave}
        onExit={handleCloseDialog}
      />

      <AlternativeEvaluationSubmitDialog
        open={openSubmitDialog}
        onClose={() => setOpenSubmitDialog(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
};

export default AlternativeCriteriaMatrixEvaluationDialog;
