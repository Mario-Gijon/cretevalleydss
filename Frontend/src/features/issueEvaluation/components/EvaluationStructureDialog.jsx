import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";

import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import { useIssuesDataContext } from "../../../context/issues/issues.context";
import {
  EVALUATION_STAGES,
  getEvaluationStructureEntryForStage,
} from "../../decisionPlugins/evaluations/registry";
import { buildEvaluationContext } from "../logic/buildEvaluationContext";
import {
  fetchIssueEvaluation,
  saveIssueEvaluation,
  submitIssueEvaluationPayload,
} from "../services/issueEvaluation.service";
import AlternativeEvaluationDialogShell from "./AlternativeEvaluationDialogShell";
import AlternativeEvaluationSaveDialog from "./AlternativeEvaluationSaveDialog";
import AlternativeEvaluationSubmitDialog from "./AlternativeEvaluationSubmitDialog";

const EvaluationStructureDialog = ({
  issue,
  stage,
  structureKey,
  isOpen,
  setIsOpen,
  setOpenIssueDialog,
}) => {
  const isMobile = useMediaQuery("(max-width:900px)");
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { fetchActiveIssues } = useIssuesDataContext();

  const structureEntry = useMemo(
    () =>
      getEvaluationStructureEntryForStage({
        structureKey,
        stage,
      }),
    [stage, structureKey]
  );
  const View = structureEntry?.View || null;
  const fallbackEvaluationContext = useMemo(
    () =>
      buildEvaluationContext({
        issue,
        stage,
        structure: structureEntry,
        alternatives: issue?.alternatives || [],
        criteriaTree: issue?.criteria || [],
      }),
    [issue, stage, structureEntry]
  );
  const [evaluationContext, setEvaluationContext] = useState(
    fallbackEvaluationContext
  );
  const [evaluationPayload, setEvaluationPayload] = useState({});
  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCollective, setShowCollective] = useState(false);
  const [collectivePayload, setCollectivePayload] = useState(null);
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [openSubmitDialog, setOpenSubmitDialog] = useState(false);
  const viewRef = useRef(null);
  const evaluationPayloadRef = useRef(evaluationPayload);
  const issueId = String(issue?.id ?? issue?._id ?? "").trim() || null;

  useEffect(() => {
    evaluationPayloadRef.current = evaluationPayload;
  }, [evaluationPayload]);

  useEffect(() => {
    if (!isOpen || !issueId) return;

    const loadEvaluation = async () => {
      setLoading(true);
      setEvaluationContext(fallbackEvaluationContext);
      setEvaluationPayload({});
      try {
        const {
          evaluationContext: responseEvaluationContext,
          payload: nextEvaluationPayload,
          collectivePayload: nextCollectivePayload,
        } = await fetchIssueEvaluation(issueId, stage);

        setEvaluationContext(responseEvaluationContext);
        setEvaluationPayload(nextEvaluationPayload);
        setCollectivePayload(nextCollectivePayload);
        setShowCollective(nextCollectivePayload !== null);
        setInitialSnapshot(JSON.stringify(nextEvaluationPayload));
      } catch {
        showSnackbarAlert(
          "Could not load evaluation context for this evaluation.",
          "error"
        );
        setEvaluationContext(fallbackEvaluationContext);
        setEvaluationPayload({});
        setCollectivePayload(null);
        setShowCollective(false);
        setInitialSnapshot(JSON.stringify({}));
      } finally {
        setLoading(false);
      }
    };

    loadEvaluation();
  }, [fallbackEvaluationContext, isOpen, issueId, showSnackbarAlert, stage]);

  const preparePayloadRead = async () => {
    if (typeof viewRef.current?.preparePayloadRead === "function") {
      await viewRef.current.preparePayloadRead();
    } else if (typeof viewRef.current?.flushPendingEdits === "function") {
      await viewRef.current.flushPendingEdits();
    }

    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
    return evaluationPayloadRef.current;
  };

  const validatePreparedPayloadRead = async () => {
    await preparePayloadRead();

    if (typeof viewRef.current?.validatePayloadRead !== "function") {
      return { valid: true, errors: [] };
    }

    return viewRef.current.validatePayloadRead();
  };

  const handleCloseRequest = async () => {
    const nextEvaluationPayload = await preparePayloadRead();

    if (JSON.stringify(nextEvaluationPayload) !== initialSnapshot) {
      setOpenSaveDialog(true);
      return;
    }

    setIsOpen(false);
  };

  const handleClear = () => {
    setEvaluationPayload({});
    showSnackbarAlert("All evaluations cleared", "success");
  };

  const handleSave = async () => {
    const validation = await validatePreparedPayloadRead();

    if (!validation.valid) {
      const firstError = validation.errors[0];
      setOpenSaveDialog(false);
      showSnackbarAlert(
        firstError
          ? `${firstError.alternativeName} / ${firstError.criterionName}: ${firstError.message}`
          : "Evaluation contains invalid values.",
        "error"
      );
      return;
    }

    const nextEvaluationPayload = evaluationPayloadRef.current;
    setLoading(true);
    setOpenSaveDialog(false);

    const response = await saveIssueEvaluation(issueId, stage, nextEvaluationPayload);

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
    const validation = await validatePreparedPayloadRead();

    if (!validation.valid) {
      const firstError = validation.errors[0];
      showSnackbarAlert(
        firstError
          ? `${firstError.alternativeName} / ${firstError.criterionName}: ${firstError.message}`
          : "Evaluation contains invalid values.",
        "error"
      );
      return;
    }

    setOpenSubmitDialog(true);
  };

  const handleSubmit = async () => {
    const validation = await validatePreparedPayloadRead();

    if (!validation.valid) {
      const firstError = validation.errors[0];
      setOpenSubmitDialog(false);
      showSnackbarAlert(
        firstError
          ? `${firstError.alternativeName} / ${firstError.criterionName}: ${firstError.message}`
          : "Evaluation contains invalid values.",
        "error"
      );
      return;
    }

    const nextEvaluationPayload = evaluationPayloadRef.current;
    setOpenSubmitDialog(false);
    setLoading(true);

    const response = await submitIssueEvaluationPayload(
      issueId,
      stage,
      nextEvaluationPayload
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

  const dialogTitle =
    stage === EVALUATION_STAGES.CRITERIA_WEIGHTING
      ? "Criteria weighting"
      : stage === EVALUATION_STAGES.ALTERNATIVE_EVALUATION
        ? "Alternative evaluation"
        : "Evaluation";
  const hasExpressionDomains = Array.isArray(evaluationContext?.leafCriteria)
    ? evaluationContext.leafCriteria.some((criterion) => criterion?.expressionDomain)
    : false;

  const renderView = () => {
    if (!View) {
      return null;
    }

    const visibleCollectivePayload = showCollective ? collectivePayload : null;
    const viewProps = {
      evaluationContext,
      evaluationPayload,
      setEvaluationPayload,
      collectivePayload: visibleCollectivePayload,
      readOnly: false,
      loading,
    };

    return <View ref={viewRef} {...viewProps} />;
  };

  if (!issue || !stage || !structureEntry || !View) {
    return null;
  }

  return (
    <>
      <AlternativeEvaluationDialogShell
        open={isOpen}
        onClose={handleCloseRequest}
        loading={loading}
        fullScreen={isMobile}
        maxWidth="lg"
        icon={null}
        title={dialogTitle}
        subtitle={issue?.name || ""}
        criteria={evaluationContext.leafCriteria}
        showExpressionDomains={hasExpressionDomains}
        showCollectiveControl={collectivePayload !== null}
        collectiveVisible={showCollective}
        onToggleCollective={() => setShowCollective((value) => !value)}
        contentSx={{ p: { xs: 1.5, sm: 2.2 } }}
        actions={
          <>
            <Button
              variant="outlined"
              color="error"
              onClick={handleClear}
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
        {renderView()}
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

export default EvaluationStructureDialog;
