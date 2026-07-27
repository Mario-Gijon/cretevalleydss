import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";

import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import { useIssuesDataContext } from "../../../context/issues/issues.context";
import {
  EVALUATION_STAGES,
  getEvaluationStructureEntryForStage,
} from "../../decisionPlugins/evaluations/registry";
import { buildDecisionContext } from "../logic/buildDecisionContext";
import {
  fetchIssueEvaluation,
  saveIssueEvaluation,
  submitIssueEvaluationPayload,
} from "../services/issueEvaluation.service";
import { requireCompleteEvaluationObject } from "../logic/requireCompleteEvaluationObject";
import AlternativeEvaluationDialogShell from "./AlternativeEvaluationDialogShell";
import AlternativeEvaluationSaveDialog from "./AlternativeEvaluationSaveDialog";
import AlternativeEvaluationSubmitDialog from "./AlternativeEvaluationSubmitDialog";

const serializeEvaluationSnapshot = (evaluation) =>
  evaluation === null ? null : JSON.stringify(evaluation);

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
  const fallbackDecisionContext = useMemo(
    () =>
      buildDecisionContext({
        issue,
        stage,
        structure: structureEntry,
        alternatives: issue?.alternatives || [],
        criteriaTree: issue?.criteria || [],
      }),
    [issue, stage, structureEntry]
  );
  const [decisionContext, setDecisionContext] = useState(
    fallbackDecisionContext
  );
  const [evaluation, setEvaluationState] = useState(null);
  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [showCollective, setShowCollective] = useState(false);
  const [collectiveEvaluation, setCollectiveEvaluation] = useState(null);
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [openSubmitDialog, setOpenSubmitDialog] = useState(false);
  const issueId = String(issue?.id ?? issue?._id ?? "").trim() || null;
  const evaluationLoading =
    loading || (isOpen === true && evaluation === null && !loadError);

  const setEvaluation = (nextEvaluation) => {
    setEvaluationState(requireCompleteEvaluationObject(nextEvaluation));
  };

  useEffect(() => {
    if (!isOpen || !issueId) return;

    const loadEvaluation = async () => {
      setLoading(true);
      setDecisionContext(fallbackDecisionContext);
      setEvaluationState(null);
      setInitialSnapshot(null);
      setCollectiveEvaluation(null);
      setShowCollective(false);
      setLoadError("");
      try {
        const {
          decisionContext: responseDecisionContext,
          evaluation: nextEvaluation,
          collectiveEvaluation: nextCollectiveEvaluation,
        } = await fetchIssueEvaluation(issueId, stage);
        const canonicalEvaluation =
          requireCompleteEvaluationObject(nextEvaluation);

        setDecisionContext(responseDecisionContext);
        setEvaluationState(canonicalEvaluation);
        setCollectiveEvaluation(nextCollectiveEvaluation);
        setShowCollective(nextCollectiveEvaluation !== null);
        setInitialSnapshot(
          serializeEvaluationSnapshot(canonicalEvaluation)
        );
      } catch {
        const message =
          "Could not load evaluation context for this evaluation.";
        showSnackbarAlert(message, "error");
        setDecisionContext(fallbackDecisionContext);
        setEvaluationState(null);
        setCollectiveEvaluation(null);
        setShowCollective(false);
        setInitialSnapshot(null);
        setLoadError(message);
      } finally {
        setLoading(false);
      }
    };

    loadEvaluation();
  }, [fallbackDecisionContext, isOpen, issueId, showSnackbarAlert, stage]);

  const handleCloseRequest = () => {
    if (
      evaluationLoading ||
      evaluation === null ||
      initialSnapshot === null
    ) {
      setIsOpen(false);
      return;
    }

    if (serializeEvaluationSnapshot(evaluation) !== initialSnapshot) {
      setOpenSaveDialog(true);
      return;
    }

    setIsOpen(false);
  };

  const handleSave = async () => {
    if (evaluation === null || evaluationLoading) {
      return;
    }

    setLoading(true);
    setOpenSaveDialog(false);

    const response = await saveIssueEvaluation(issueId, stage, evaluation);

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
    if (evaluation === null || evaluationLoading) {
      return;
    }

    setOpenSubmitDialog(true);
  };

  const handleSubmit = async () => {
    if (evaluation === null || evaluationLoading) {
      setOpenSubmitDialog(false);
      return;
    }

    setOpenSubmitDialog(false);
    setLoading(true);

    const response = await submitIssueEvaluationPayload(
      issueId,
      stage,
      evaluation
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
  const hasExpressionDomains = Array.isArray(decisionContext?.leafCriteria)
    ? decisionContext.leafCriteria.some((criterion) => criterion?.expressionDomain)
    : false;

  const renderView = () => {
    if (!View) {
      return null;
    }
    if (loadError) {
      return <Alert severity="error">{loadError}</Alert>;
    }

    const visibleCollectiveEvaluation = showCollective
      ? collectiveEvaluation
      : null;
    const viewProps = {
      decisionContext,
      evaluation,
      setEvaluation,
      collectiveEvaluation: visibleCollectiveEvaluation,
      readOnly: false,
      loading: evaluationLoading,
    };

    return <View {...viewProps} />;
  };

  if (!issue || !stage || !structureEntry || !View) {
    return null;
  }

  return (
    <>
      <AlternativeEvaluationDialogShell
        open={isOpen}
        onClose={handleCloseRequest}
        loading={evaluationLoading}
        fullScreen={isMobile}
        maxWidth="lg"
        icon={null}
        title={dialogTitle}
        subtitle={issue?.name || ""}
        criteria={decisionContext.leafCriteria}
        showExpressionDomains={hasExpressionDomains}
        showCollectiveControl={collectiveEvaluation !== null}
        collectiveVisible={showCollective}
        onToggleCollective={() => setShowCollective((value) => !value)}
        contentSx={{ p: { xs: 1.5, sm: 2.2 } }}
        actions={
          <>
            <Box sx={{ flex: 1 }} />

            <Button
              variant="outlined"
              color="success"
              onClick={handleOpenSubmit}
              startIcon={<PublishOutlinedIcon />}
              disabled={evaluationLoading || evaluation === null}
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
