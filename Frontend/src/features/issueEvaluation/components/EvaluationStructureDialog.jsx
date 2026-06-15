import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";

import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import { useIssuesDataContext } from "../../../context/issues/issues.context";
import { getEvaluationStructureEntryForStage } from "../evaluationStructureRegistry";
import { EVALUATION_STAGES } from "../evaluation.constants";
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
  const adapter = structureEntry?.adapter || null;
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
  const emptyEvaluationPayload = useMemo(
    () =>
      adapter?.createEmptyPayload({
        evaluationContext: fallbackEvaluationContext,
      }) || {},
    [adapter, fallbackEvaluationContext]
  );

  const [evaluationPayload, setEvaluationPayload] = useState(emptyEvaluationPayload);
  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCollective, setShowCollective] = useState(false);
  const [collectivePayload, setCollectivePayload] = useState(null);
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [openSubmitDialog, setOpenSubmitDialog] = useState(false);
  const viewRef = useRef(null);
  const evaluationPayloadRef = useRef(evaluationPayload);

  useEffect(() => {
    evaluationPayloadRef.current = evaluationPayload;
  }, [evaluationPayload]);

  useEffect(() => {
    if (!isOpen || !issue?.id || !adapter) return;

    const loadEvaluation = async () => {
      setLoading(true);
      setEvaluationContext(fallbackEvaluationContext);
      setEvaluationPayload(
        adapter.createEmptyPayload({
          evaluationContext: fallbackEvaluationContext,
        })
      );
      try {
        const response = await fetchIssueEvaluation(issue.id, stage);
        const responseEvaluationContext =
          response?.data?.evaluationContext || fallbackEvaluationContext;
        const nextEvaluationPayload = adapter.fromBackendPayload({
          evaluationContext: responseEvaluationContext,
          backendPayload: response?.data?.payload || null,
        });
        const nextCollectivePayload = adapter.fromCollectivePayload({
          evaluationContext: responseEvaluationContext,
          collectivePayload:
            response?.data?.collectiveReference?.collectiveEvaluations || null,
        });

        setEvaluationContext(responseEvaluationContext);
        setEvaluationPayload(nextEvaluationPayload);
        setCollectivePayload(nextCollectivePayload);
        setShowCollective(nextCollectivePayload !== null);
        setInitialSnapshot(JSON.stringify(nextEvaluationPayload));
      } catch {
        const fallbackPayload = adapter.createEmptyPayload({
          evaluationContext: fallbackEvaluationContext,
        });
        setEvaluationContext(fallbackEvaluationContext);
        setEvaluationPayload(fallbackPayload);
        setCollectivePayload(null);
        setShowCollective(false);
        setInitialSnapshot(JSON.stringify(fallbackPayload));
      } finally {
        setLoading(false);
      }
    };

    loadEvaluation();
  }, [isOpen, issue?.id, stage, adapter, fallbackEvaluationContext]);

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

  const validatePayload = ({ mode, nextEvaluationPayload }) => {
    if (!adapter) {
      return false;
    }

    const result = adapter.validate({
      evaluationContext,
      evaluationPayload: nextEvaluationPayload,
      mode,
    });

    if (result?.valid === true) {
      return true;
    }

    showSnackbarAlert(result?.message || "Invalid evaluation payload.", "error");
    return false;
  };

  const handleCloseRequest = () => {
    if (JSON.stringify(evaluationPayload) !== initialSnapshot) {
      setOpenSaveDialog(true);
      return;
    }

    setIsOpen(false);
  };

  const handleClear = () => {
    setEvaluationPayload(
      adapter.createEmptyPayload({
        evaluationContext,
      })
    );
    showSnackbarAlert("All evaluations cleared", "success");
  };

  const handleSave = async () => {
    const nextEvaluationPayload = await preparePayloadRead();
    if (!validatePayload({ mode: "draft", nextEvaluationPayload })) {
      return;
    }

    setLoading(true);
    setOpenSaveDialog(false);

    const backendPayload = adapter.toBackendPayload({
      evaluationContext,
      evaluationPayload: nextEvaluationPayload,
      mode: "draft",
    });
    const response = await saveIssueEvaluation(issue.id, stage, backendPayload);

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
    const nextEvaluationPayload = await preparePayloadRead();
    if (!validatePayload({ mode: "submit", nextEvaluationPayload })) {
      return;
    }

    setOpenSubmitDialog(true);
  };

  const handleSubmit = async () => {
    const nextEvaluationPayload = await preparePayloadRead();
    if (!validatePayload({ mode: "submit", nextEvaluationPayload })) {
      return;
    }

    setOpenSubmitDialog(false);
    setLoading(true);

    const backendPayload = adapter.toBackendPayload({
      evaluationContext,
      evaluationPayload: nextEvaluationPayload,
      mode: "submit",
    });
    const response = await submitIssueEvaluationPayload(
      issue.id,
      stage,
      backendPayload
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
  const hasExpressionDomains = Array.isArray(
    evaluationContext?.criteria?.leafItems
  )
    ? evaluationContext.criteria.leafItems.some(
        (criterion) => criterion?.expressionDomain
      )
    : false;

  const renderView = () => {
    if (!View || !adapter) {
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

  if (!issue || !stage || !structureEntry || !View || !adapter) {
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
        criteria={evaluationContext.criteria.leafItems}
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
