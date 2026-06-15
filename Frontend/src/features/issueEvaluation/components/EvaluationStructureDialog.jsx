import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Stack } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";

import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import { useIssuesDataContext } from "../../../context/issues/issues.context";
import { buildEvaluationContext } from "../context/buildEvaluationContext";
import { getEvaluationStructureEntryForStage } from "../evaluationStructureRegistry";
import {
  fetchIssueEvaluation,
  saveIssueEvaluation,
  submitIssueEvaluationPayload,
} from "../services/issueEvaluation.service";
import AlternativeEvaluationDialogShell from "./AlternativeEvaluationDialogShell";
import AlternativeEvaluationSaveDialog from "./AlternativeEvaluationSaveDialog";
import AlternativeEvaluationSubmitDialog from "./AlternativeEvaluationSubmitDialog";
import { sectionSx } from "../styles/alternativeEvaluationDialog.styles";
import {
  inputSx,
  sectionSx as weightSectionSx,
} from "../styles/weightEvaluationDialog.styles";

const EvaluationStructureDialog = ({
  issue,
  stage,
  structureKey,
  isOpen,
  setIsOpen,
  setOpenIssueDialog,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
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
  const dialogConfig = structureEntry?.dialog || {};
  const evaluationContext = useMemo(
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
  const emptyEvaluationPayload = useMemo(
    () =>
      adapter?.createEmptyPayload({
        evaluationContext,
      }) || {},
    [adapter, evaluationContext]
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
    setEvaluationPayload(emptyEvaluationPayload);
  }, [emptyEvaluationPayload]);

  useEffect(() => {
    if (!isOpen || !issue?.id || !adapter) return;

    const loadEvaluation = async () => {
      setLoading(true);
      try {
        const response = await fetchIssueEvaluation(issue.id, stage);
        const nextEvaluationPayload = adapter.fromBackendPayload({
          evaluationContext,
          backendPayload: response?.data?.payload || null,
        });
        const nextCollectivePayload = adapter.fromCollectivePayload({
          evaluationContext,
          collectivePayload:
            response?.data?.collectiveReference?.collectiveEvaluations || null,
        });

        setEvaluationPayload(nextEvaluationPayload);
        setCollectivePayload(nextCollectivePayload);
        setShowCollective(nextCollectivePayload !== null);
        setInitialSnapshot(JSON.stringify(nextEvaluationPayload));
      } catch {
        setEvaluationPayload(emptyEvaluationPayload);
        setCollectivePayload(null);
        setShowCollective(false);
        setInitialSnapshot(JSON.stringify(emptyEvaluationPayload));
      } finally {
        setLoading(false);
      }
    };

    loadEvaluation();
  }, [isOpen, issue?.id, stage, adapter, evaluationContext, emptyEvaluationPayload]);

  const preparePayloadRead = async () => {
    if (dialogConfig?.supportsPreparePayloadRead) {
      if (typeof viewRef.current?.preparePayloadRead === "function") {
        await viewRef.current.preparePayloadRead();
      } else if (typeof viewRef.current?.flushPendingEdits === "function") {
        await viewRef.current.flushPendingEdits();
      }
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
    setEvaluationPayload(emptyEvaluationPayload);
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

    const viewNode = dialogConfig?.supportsPreparePayloadRead ? (
      <View ref={viewRef} {...viewProps} />
    ) : (
      <View {...viewProps} />
    );

    switch (dialogConfig?.frame) {
      case "matrix":
        return (
          <Box
            sx={{
              ...sectionSx(theme),
              maxWidth: 1400,
              mx: "auto",
              p: { xs: 1, sm: 1.5 },
            }}
          >
            {viewNode}
          </Box>
        );
      case "pairwise":
        return (
          <Stack spacing={1.2} sx={{ maxWidth: 1400, mx: "auto" }}>
            <Box
              sx={{
                ...sectionSx(theme),
                p: { xs: 1, sm: 1.4 },
                overflow: "hidden",
              }}
            >
              {viewNode}
            </Box>
          </Stack>
        );
      case "manualCriteriaWeights":
        return (
          <Stack spacing={2.2} sx={{ maxWidth: 900, mx: "auto" }}>
            <Box sx={weightSectionSx(theme)}>
              <Box sx={{ ...inputSx(theme), p: 0 }}>{viewNode}</Box>
            </Box>
          </Stack>
        );
      default:
        return viewNode;
    }
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
        fullScreen={dialogConfig?.fullScreenOnMobile ? isMobile : false}
        maxWidth={dialogConfig?.maxWidth || "lg"}
        icon={dialogConfig?.icon || null}
        title={dialogConfig?.title || structureEntry.label || "Evaluation"}
        subtitle={issue?.name || ""}
        criteria={evaluationContext.criteria.leafItems}
        showExpressionDomains={dialogConfig?.showExpressionDomains === true}
        showCollectiveControl={
          dialogConfig?.showCollectiveToggle === true && collectivePayload !== null
        }
        collectiveVisible={showCollective}
        onToggleCollective={() => setShowCollective((value) => !value)}
        contentSx={dialogConfig?.contentSx || { p: { xs: 1.5, sm: 2.2 } }}
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
