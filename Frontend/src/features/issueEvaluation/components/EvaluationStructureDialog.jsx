import { useEffect, useMemo, useState } from "react";
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
  const [evaluation, setEvaluationState] = useState({});
  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCollective, setShowCollective] = useState(false);
  const [collectiveEvaluation, setCollectiveEvaluation] = useState(null);
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [openSubmitDialog, setOpenSubmitDialog] = useState(false);
  const issueId = String(issue?.id ?? issue?._id ?? "").trim() || null;

  const setEvaluation = (nextEvaluation) => {
    setEvaluationState(requireCompleteEvaluationObject(nextEvaluation));
  };

  useEffect(() => {
    if (!isOpen || !issueId) return;

    const loadEvaluation = async () => {
      setLoading(true);
      setDecisionContext(fallbackDecisionContext);
      setEvaluationState({});
      setInitialSnapshot(JSON.stringify({}));
      setCollectiveEvaluation(null);
      setShowCollective(false);
      try {
        const {
          decisionContext: responseDecisionContext,
          evaluation: nextEvaluation,
          collectiveEvaluation: nextCollectiveEvaluation,
        } = await fetchIssueEvaluation(issueId, stage);

        setDecisionContext(responseDecisionContext);
        setEvaluationState(nextEvaluation);
        setCollectiveEvaluation(nextCollectiveEvaluation);
        setShowCollective(nextCollectiveEvaluation !== null);
        setInitialSnapshot(JSON.stringify(nextEvaluation));
      } catch {
        showSnackbarAlert(
          "Could not load evaluation context for this evaluation.",
          "error"
        );
        setDecisionContext(fallbackDecisionContext);
        setEvaluationState({});
        setCollectiveEvaluation(null);
        setShowCollective(false);
        setInitialSnapshot(JSON.stringify({}));
      } finally {
        setLoading(false);
      }
    };

    loadEvaluation();
  }, [fallbackDecisionContext, isOpen, issueId, showSnackbarAlert, stage]);

  const handleCloseRequest = () => {
    if (JSON.stringify(evaluation) !== initialSnapshot) {
      setOpenSaveDialog(true);
      return;
    }

    setIsOpen(false);
  };

  const handleClear = () => {
    setEvaluationState({});
    showSnackbarAlert("All evaluations cleared", "success");
  };

  const handleSave = async () => {
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
    setOpenSubmitDialog(true);
  };

  const handleSubmit = async () => {
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

    const visibleCollectiveEvaluation = showCollective
      ? collectiveEvaluation
      : null;
    const viewProps = {
      decisionContext,
      evaluation,
      setEvaluation,
      collectiveEvaluation: visibleCollectiveEvaluation,
      readOnly: false,
      loading,
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
        loading={loading}
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
