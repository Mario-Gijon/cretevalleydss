import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Box,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";

import { useSnackbarAlertContext } from "../../../../context/snackbarAlert/snackbarAlert.context";
import { useIssuesDataContext } from "../../../../context/issues/issues.context";
import DirectEvaluationMatrix from "./DirectEvaluationMatrix.jsx";
import AlternativeEvaluationSaveDialog from "../../shared/components/AlternativeEvaluationSaveDialog.jsx";
import AlternativeEvaluationSubmitDialog from "../../shared/components/AlternativeEvaluationSubmitDialog.jsx";
import AlternativeEvaluationDialogShell from "../../shared/components/AlternativeEvaluationDialogShell.jsx";
import { extractLeafCriteria } from "../../shared/leafCriteria.utils.js";
import { validateDirectEvaluations } from "./directEvaluation.validation.js";
import { sectionSx } from "../../shared/alternativeEvaluationDialog.styles.js";
import {
  getEvaluations,
  saveEvaluations,
  submitEvaluations,
} from "../../../../services/issue.service.js";
import {
  buildClearedDirectEvaluations,
  buildDirectEvaluationsMatrix,
  buildDirectSavePayload,
  buildDirectSubmitPayload,
} from "./directEvaluation.mapper.js";
import {
  extractDirectCollectiveEvaluations,
  extractDirectDraftEvaluations,
} from "./directEvaluation.response.js";

/**
 * Diálogo de evaluación directa de alternativas.
 *
 * @param {Object} props
 * @param {Function} props.setOpenIssueDialog
 * @param {boolean} props.isRatingAlternatives
 * @param {Function} props.setIsRatingAlternatives
 * @param {Object} props.selectedIssue
 * @returns {JSX.Element}
 */
const DirectAlternativesEvaluationDialog = ({
  setOpenIssueDialog,
  isRatingAlternatives,
  setIsRatingAlternatives,
  selectedIssue,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { fetchActiveIssues, fetchFinishedIssues } = useIssuesDataContext();

  const [evaluations, setEvaluations] = useState({});
  const [openCloseDialog, setOpenCloseDialog] = useState(false);
  const [openSubmitEvaluationsDialog, setOpenSubmitEvaluationsDialog] = useState(false);
  const [initialEvaluations, setInitialEvaluations] = useState(null);
  const [collectiveEvaluations, setCollectiveEvaluations] = useState(null);
  const [pendingSubmitEvaluations, setPendingSubmitEvaluations] = useState(null);
  const [loading, setLoading] = useState(false);
  const matrixRef = useRef(null);
  const evaluationsRef = useRef(evaluations);

  useEffect(() => {
    evaluationsRef.current = evaluations;
  }, [evaluations]);

  const leafCriteriaNames = useMemo(
    () => extractLeafCriteria(selectedIssue?.criteria || []).map((criterion) => criterion.name),
    [selectedIssue]
  );

  const flushPendingGridEdit = async () => {
    if (matrixRef.current?.flushPendingEdits) {
      await matrixRef.current.flushPendingEdits();
    }

    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  const getAuthoritativeEvaluations = async () => {
    await flushPendingGridEdit();
    return evaluationsRef.current;
  };

  useEffect(() => {
    if (!isRatingAlternatives || !selectedIssue?.id) {
      return;
    }

    const fetchCurrentEvaluations = async () => {
      setLoading(true);

      try {
        const response = await getEvaluations(selectedIssue.id);

        const evaluationsPayload = extractDirectDraftEvaluations(response);
        const collectivePayload = extractDirectCollectiveEvaluations(response);

        if (response.success && evaluationsPayload) {
          setCollectiveEvaluations(collectivePayload);

          const merged = buildDirectEvaluationsMatrix({
            alternatives: selectedIssue?.alternatives || [],
            leafCriteria: leafCriteriaNames,
            fetchedEvaluations: evaluationsPayload,
          });
          setEvaluations(merged);
          setInitialEvaluations(JSON.stringify(merged));
        } else {
          const merged = buildDirectEvaluationsMatrix({
            alternatives: selectedIssue?.alternatives || [],
            leafCriteria: leafCriteriaNames,
            fetchedEvaluations: {},
          });
          setEvaluations(merged);
          setInitialEvaluations(JSON.stringify(merged));
        }
      } catch (error) {
        console.error("Error fetching evaluations:", error);
        const merged = buildDirectEvaluationsMatrix({
          alternatives: selectedIssue?.alternatives || [],
          leafCriteria: leafCriteriaNames,
          fetchedEvaluations: {},
        });
        setEvaluations(merged);
        setInitialEvaluations(JSON.stringify(merged));
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentEvaluations();

  }, [isRatingAlternatives, selectedIssue, leafCriteriaNames]);

  const handleClearAllEvaluations = () => {
    const cleared = buildClearedDirectEvaluations({
      alternatives: selectedIssue?.alternatives || [],
      criteria: leafCriteriaNames,
      evaluations,
    });

    setEvaluations(cleared);
    showSnackbarAlert("All evaluations cleared", "success");
  };

  const handleCloseDialog = () => {
    setOpenCloseDialog(false);
    setPendingSubmitEvaluations(null);
    setIsRatingAlternatives(false);
  };

  const handleConfirmChanges = () => {
    if (JSON.stringify(evaluations) === initialEvaluations) {
      setOpenCloseDialog(false);
      setPendingSubmitEvaluations(null);
      setIsRatingAlternatives(false);
      return;
    }

    setOpenCloseDialog(true);
  };

  const handleOpenSubmitEvaluationsDialog = async () => {
    const nextEvaluations = await getAuthoritativeEvaluations();

    const validation = validateDirectEvaluations(nextEvaluations, {
      leafCriteria: leafCriteriaNames,
      allowEmpty: false,
    });

    if (!validation.valid) {
      const { alternative, criterion, message } = validation.error;
      showSnackbarAlert(
        `Alternative: ${alternative}, Criterion: ${criterion}, ${message}`,
        "error"
      );
      return;
    }

    setPendingSubmitEvaluations(nextEvaluations);
    setOpenSubmitEvaluationsDialog(true);
  };

  const handleSaveEvaluations = async () => {
    const nextEvaluations = await getAuthoritativeEvaluations();

    const validation = validateDirectEvaluations(nextEvaluations, {
      leafCriteria: leafCriteriaNames,
      allowEmpty: true,
    });

    if (!validation.valid) {
      const { alternative, criterion, message } = validation.error;
      showSnackbarAlert(
        `Alternative: ${alternative}, Criterion: ${criterion}, ${message}`,
        "error"
      );
      return;
    }

    setLoading(true);
    setOpenCloseDialog(false);
    const payload = buildDirectSavePayload({ evaluations: nextEvaluations });

    const evaluationSaved = await saveEvaluations(
      selectedIssue.id,
      payload
    );

    if (evaluationSaved.success) {
      setOpenCloseDialog(false);
      setIsRatingAlternatives(false);
      showSnackbarAlert("Evaluations saved successfully", "success");
    } else {
      evaluationSaved?.message &&
        showSnackbarAlert(evaluationSaved.message, "error");
    }

    setLoading(false);
  };

  const handleSubmitEvaluations = async () => {
    setOpenSubmitEvaluationsDialog(false);
    setLoading(true);

    const nextEvaluations = pendingSubmitEvaluations ?? (await getAuthoritativeEvaluations());
    const payload = buildDirectSubmitPayload({ evaluations: nextEvaluations });
    const response = await submitEvaluations(selectedIssue, payload);

    if (response.success) {
      showSnackbarAlert(response?.message || "Evaluations submitted successfully", "success");
      await fetchActiveIssues();
      await fetchFinishedIssues();
      setOpenIssueDialog(false);
      setIsRatingAlternatives(false);
    } else {
      showSnackbarAlert(response?.message || "Error submitting evaluations", "error");
    }

    setLoading(false);
    setPendingSubmitEvaluations(null);
  };

  return (
    <>
      <AlternativeEvaluationDialogShell
        open={isRatingAlternatives}
        onClose={handleConfirmChanges}
        loading={loading}
        fullScreen={isMobile}
        maxWidth="lg"
        icon={TableChartOutlinedIcon}
        title="Alternative evaluation"
        subtitle={selectedIssue?.name || ""}
        contentSx={{ p: { xs: 1.5, sm: 2.2 } }}
        actions={
          <>
            <Button
              variant="outlined"
              color="error"
              onClick={handleClearAllEvaluations}
              startIcon={<DeleteSweepOutlinedIcon />}
            >
              Clear all
            </Button>

            <Box sx={{ flex: 1 }} />

            <Button
              variant="outlined"
              color="success"
              onClick={handleOpenSubmitEvaluationsDialog}
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
          {selectedIssue && !loading && (
            <DirectEvaluationMatrix
              ref={matrixRef}
              alternatives={selectedIssue.alternatives}
              criteria={leafCriteriaNames.slice().sort()}
              evaluations={evaluations}
              setEvaluations={setEvaluations}
              collectiveEvaluations={collectiveEvaluations}
            />
          )}
        </Box>
      </AlternativeEvaluationDialogShell>

      <AlternativeEvaluationSaveDialog
        open={openCloseDialog}
        onClose={() => setOpenCloseDialog(false)}
        onSave={handleSaveEvaluations}
        onExit={handleCloseDialog}
      />

      <AlternativeEvaluationSubmitDialog
        open={openSubmitEvaluationsDialog}
        onClose={() => setOpenSubmitEvaluationsDialog(false)}
        onSubmit={handleSubmitEvaluations}
      />
    </>
  );
};

export default DirectAlternativesEvaluationDialog;
