import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, Stack } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import GridOnOutlinedIcon from "@mui/icons-material/GridOnOutlined";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";

import { useSnackbarAlertContext } from "../../../../context/snackbarAlert/snackbarAlert.context";
import { useIssuesDataContext } from "../../../../context/issues/issues.context";
import CriterionCompactSelector from "./CriterionCompactSelector";
import AlternativePairwiseByCriterionView from "./AlternativePairwiseByCriterionView";
import AlternativeEvaluationSaveDialog from "../../components/AlternativeEvaluationSaveDialog";
import AlternativeEvaluationSubmitDialog from "../../components/AlternativeEvaluationSubmitDialog";
import AlternativeEvaluationDialogShell from "../../components/AlternativeEvaluationDialogShell";
import { getLeafCriteria } from "../../../../utils/criteria.utils";
import { buildEvaluationViewContext } from "../../context/buildEvaluationViewContext";
import { sectionSx } from "../../styles/alternativeEvaluationDialog.styles";
import {
  fetchIssueEvaluation,
  saveIssueEvaluation,
  submitIssueEvaluationPayload,
} from "../../services/issueEvaluation.service";
import { EVALUATION_STAGES } from "../../evaluation.constants";
import { getEvaluationStructureEntryForStage } from "../../evaluationStructureRegistry";

const AlternativePairwiseByCriterionEvaluationDialog = ({
  issue,
  isOpen,
  setIsOpen,
  setOpenIssueDialog,
}) => {
  const theme = useTheme();
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { fetchActiveIssues } = useIssuesDataContext();

  const [currentCriterionIndex, setCurrentCriterionIndex] = useState(0);
  const [evaluations, setEvaluations] = useState({});
  const [openCloseDialog, setOpenCloseDialog] = useState(false);
  const [openSubmitDialog, setOpenSubmitDialog] = useState(false);
  const [initialEvaluations, setInitialEvaluations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [collectiveVisible, setCollectiveVisible] = useState(false);
  const [collectiveEvaluationsByCriterion, setCollectiveEvaluationsByCriterion] =
    useState(null);

  const leafCriteria = useMemo(
    () => getLeafCriteria(issue?.criteria || []),
    [issue?.criteria]
  );
  const criterionNames = useMemo(
    () => leafCriteria.map((criterion) => criterion.name),
    [leafCriteria]
  );
  const alternatives = useMemo(() => issue?.alternatives || [], [issue?.alternatives]);
  const structureEntry = useMemo(
    () =>
      getEvaluationStructureEntryForStage({
        structureKey: "alternativePairwiseByCriterion",
        stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      }),
    []
  );
  const structureAdapter = structureEntry?.adapter;

  useEffect(() => {
    setCurrentCriterionIndex(0);
  }, [issue?.id, criterionNames.length]);

  const currentCriterion =
    leafCriteria[currentCriterionIndex] || leafCriteria[0] || null;
  const criterionId = currentCriterion?.name;
  const handleSelectedCriterionChange = useCallback(
    (criterionName) => {
      const nextIndex = leafCriteria.findIndex(
        (criterion) => criterion?.name === criterionName
      );

      if (nextIndex >= 0) {
        setCurrentCriterionIndex(nextIndex);
      }
    },
    [leafCriteria]
  );
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
        collectiveValue: collectiveEvaluationsByCriterion || {},
        collectiveVisible,
        setCollectiveVisible,
        loading,
        readOnly: false,
        selectedCriterion: criterionId || null,
        setSelectedCriterion: handleSelectedCriterionChange,
      }),
    [
      issue,
      alternatives,
      structureEntry,
      leafCriteria,
      evaluations,
      collectiveEvaluationsByCriterion,
      collectiveVisible,
      loading,
      criterionId,
      handleSelectedCriterionChange,
    ]
  );

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
        const resolvedCollectiveByCriterion =
          structureAdapter.resolveCollectivePayload({
            collectiveReference: response?.data?.collectiveReference || null,
            evaluationViewContext,
          });

        setEvaluations(merged);
        setCollectiveEvaluationsByCriterion(resolvedCollectiveByCriterion);
        setCollectiveVisible(
          Boolean(
            resolvedCollectiveByCriterion &&
              Object.keys(resolvedCollectiveByCriterion).length > 0
          )
        );
        setInitialEvaluations(JSON.stringify(merged));
      } catch {
        const emptyPayload = structureAdapter.buildEmptyPayload({
          evaluationViewContext,
        });
        setEvaluations(emptyPayload);
        setCollectiveEvaluationsByCriterion(null);
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

  const handleConfirmChanges = () => {
    if (JSON.stringify(evaluations) === initialEvaluations) {
      setOpenCloseDialog(false);
      setIsOpen(false);
      return;
    }
    setOpenCloseDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenCloseDialog(false);
    setIsOpen(false);
  };

  const handleSave = async () => {
    if (!structureAdapter) {
      return;
    }

    const validationError = structureAdapter.validateDraft({
      viewPayload: evaluations,
      evaluationViewContext,
    });

    if (validationError) {
      showSnackbarAlert(validationError, "error");
      return;
    }

    setLoading(true);
    setOpenCloseDialog(false);

    const payload = structureAdapter.toBackendPayload({
      viewPayload: evaluations,
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

  const handleOpenSubmit = () => {
    if (!structureAdapter) {
      return;
    }

    const validationError = structureAdapter.validateSubmit({
      viewPayload: evaluations,
      evaluationViewContext,
    });

    if (validationError) {
      showSnackbarAlert(validationError, "error");
      return;
    }

    setOpenSubmitDialog(true);
  };

  const handleSubmit = async () => {
    setOpenSubmitDialog(false);
    setLoading(true);

    const payload = structureAdapter.toBackendPayload({
      viewPayload: evaluations,
      evaluationViewContext,
    });
    const response = await submitIssueEvaluationPayload(
      issue.id,
      EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
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
        onClose={handleConfirmChanges}
        loading={loading}
        maxWidth="lg"
        icon={GridOnOutlinedIcon}
        title="Alternative evaluation"
        subtitle={issue?.name || ""}
        criteria={leafCriteria}
        showExpressionDomains
        showCollectiveControl={
          Boolean(
            collectiveEvaluationsByCriterion &&
              Object.keys(collectiveEvaluationsByCriterion).length > 0
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
              startIcon={<DeleteSweepOutlinedIcon />}
              onClick={handleClearAll}
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
        <Stack spacing={1.2} sx={{ maxWidth: 1400, mx: "auto" }}>
          {leafCriteria.length > 1 ? (
            <CriterionCompactSelector
              criteria={leafCriteria}
              currentIndex={currentCriterionIndex}
              onSelect={setCurrentCriterionIndex}
            />
          ) : null}

          <Box
            sx={{
              ...sectionSx(theme),
              p: { xs: 1, sm: 1.4 },
              overflow: "hidden",
            }}
          >
            {issue && !loading ? (
              <AlternativePairwiseByCriterionView
                evaluationViewContext={evaluationViewContext}
              />
            ) : null}
          </Box>
        </Stack>
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

export default AlternativePairwiseByCriterionEvaluationDialog;
