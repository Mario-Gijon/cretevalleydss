import { useEffect, useMemo, useState } from "react";
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
import DirectEvaluationMatrix from "../../components/direct/DirectEvaluationMatrix.jsx";
import AlternativeEvaluationSaveDialog from "../../components/shared/AlternativeEvaluationSaveDialog.jsx";
import AlternativeEvaluationSubmitDialog from "../../components/shared/AlternativeEvaluationSubmitDialog.jsx";
import AlternativeEvaluationDialogShell from "../../components/shared/AlternativeEvaluationDialogShell.jsx";
import { extractLeafCriteria } from "../../utils/leafCriteria.utils.js";
import { validateDirectEvaluations } from "../../utils/directEvaluation.validation.js";
import { sectionSx } from "../../styles/alternativeEvaluationDialog.styles.js";
import {
  getAlternativeEvaluationDraft,
  saveAlternativeEvaluationDraft,
  submitAlternativeEvaluations,
} from "../../services/alternativeEvaluation.service.js";

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
  const [loading, setLoading] = useState(false);

  const leafCriteriaNames = useMemo(
    () => extractLeafCriteria(selectedIssue?.criteria || []).map((criterion) => criterion.name),
    [selectedIssue]
  );

  const getDomain = (cell) =>
    cell && typeof cell === "object" && cell.domain ? cell.domain : null;

  useEffect(() => {
    if (!isRatingAlternatives || !selectedIssue?.id) {
      return;
    }

    const fetchCurrentEvaluations = async () => {
      setLoading(true);

      try {
        const response = await getAlternativeEvaluationDraft(selectedIssue.id);

        const evaluationsPayload = response?.data?.evaluations ?? null;
        const collectivePayload = response?.data?.collectiveEvaluations ?? null;

        if (response.success && evaluationsPayload) {
          setCollectiveEvaluations(collectivePayload);

          const merged = mergeEvaluations(evaluationsPayload);
          setEvaluations(merged);
          setInitialEvaluations(JSON.stringify(merged));
        } else {
          const merged = mergeEvaluations({});
          setEvaluations(merged);
          setInitialEvaluations(JSON.stringify(merged));
        }
      } catch (error) {
        console.error("Error fetching evaluations:", error);
        const merged = mergeEvaluations({});
        setEvaluations(merged);
        setInitialEvaluations(JSON.stringify(merged));
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentEvaluations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRatingAlternatives, selectedIssue]);

  const mergeEvaluations = (fetchedEvaluations = {}) => {
    const merged = {};
    const alternatives = selectedIssue?.alternatives || [];
    const leafCriteria = extractLeafCriteria(selectedIssue?.criteria || []);

    alternatives.forEach((alternative) => {
      merged[alternative] = {};

      leafCriteria.forEach((criterion) => {
        const criterionName = criterion.name;
        merged[alternative][criterionName] =
          fetchedEvaluations?.[alternative]?.[criterionName] ?? {
            value: "",
            domain: null,
          };
      });
    });

    return merged;
  };

  const handleClearAllEvaluations = () => {
    const alternatives = selectedIssue?.alternatives || [];
    const criteria = leafCriteriaNames;

    const cleared = {};

    alternatives.forEach((alternative) => {
      cleared[alternative] = {};

      criteria.forEach((criterion) => {
        const previousCell = evaluations?.[alternative]?.[criterion];
        const domain = getDomain(previousCell);

        cleared[alternative][criterion] = {
          value: "",
          domain,
        };
      });
    });

    setEvaluations(cleared);
    showSnackbarAlert("All evaluations cleared", "success");
  };

  const handleCloseDialog = () => {
    setOpenCloseDialog(false);
    setIsRatingAlternatives(false);
  };

  const handleConfirmChanges = () => {
    if (JSON.stringify(evaluations) === initialEvaluations) {
      setOpenCloseDialog(false);
      setIsRatingAlternatives(false);
      return;
    }

    setOpenCloseDialog(true);
  };

  const handleOpenSubmitEvaluationsDialog = async () => {
    const validation = validateDirectEvaluations(evaluations, {
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

    setOpenSubmitEvaluationsDialog(true);
  };

  const handleSaveEvaluations = async () => {
    const validation = validateDirectEvaluations(evaluations, {
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

    const evaluationSaved = await saveAlternativeEvaluationDraft(
      selectedIssue.id,
      evaluations
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

    const response = await submitAlternativeEvaluations(selectedIssue, evaluations);

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
