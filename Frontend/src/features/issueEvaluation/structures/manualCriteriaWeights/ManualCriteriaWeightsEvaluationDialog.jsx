import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Stack,
} from "@mui/material";
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
import {
  inputSx,
  sectionSx,
} from "../../styles/weightEvaluationDialog.styles";
import AlternativeEvaluationDialogShell from "../../components/AlternativeEvaluationDialogShell";
import AlternativeEvaluationSaveDialog from "../../components/AlternativeEvaluationSaveDialog";
import AlternativeEvaluationSubmitDialog from "../../components/AlternativeEvaluationSubmitDialog";
import ManualCriteriaWeightsView from "./ManualCriteriaWeightsView";
import { buildEvaluationViewContext } from "../../context/buildEvaluationViewContext";
import { getEvaluationStructureEntryForStage } from "../../evaluationStructureRegistry";

const sumWeights = (criterionNames, valuesByCriterion) =>
  criterionNames.reduce((sum, name) => sum + Number(valuesByCriterion[name] ?? 0), 0);

const buildEmptyWeightsByCriterion = (criterionNames) =>
  Object.fromEntries(criterionNames.map((name) => [name, ""]));

const normalizeDraftWeights = (criterionNames, raw = {}) => {
  const normalized = {};

  for (const name of criterionNames) {
    const value = raw?.[name];
    if (value === "" || value === null || value === undefined) {
      normalized[name] = "";
      continue;
    }

    const numeric = Number(value);
    normalized[name] = Number.isFinite(numeric) ? numeric : "";
  }

  return normalized;
};

const ManualCriteriaWeightsEvaluationDialog = ({
  issue,
  isOpen,
  setIsOpen,
  setOpenIssueDialog,
}) => {
  const theme = useTheme();
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { fetchActiveIssues } = useIssuesDataContext();

  const leafCriteria = useMemo(() => getLeafCriteria(issue?.criteria || []), [issue?.criteria]);
  const criterionNames = useMemo(() => leafCriteria.map((criterion) => criterion.name), [leafCriteria]);
  const structureEntry = useMemo(
    () =>
      getEvaluationStructureEntryForStage({
        structureKey: "manualCriteriaWeights",
        stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
      }),
    []
  );

  const [weightsByCriterion, setWeightsByCriterion] = useState({});
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
        payloadValue: { weightsByCriterion },
        setPayload: (updater) => {
          setWeightsByCriterion((previous) => {
            const previousPayload = { weightsByCriterion: previous };
            const nextPayload =
              typeof updater === "function" ? updater(previousPayload) : updater;
            return nextPayload?.weightsByCriterion || {};
          });
        },
        loading,
        readOnly: false,
      }),
    [issue, structureEntry, leafCriteria, weightsByCriterion, loading]
  );

  useEffect(() => {
    if (!isOpen || !issue?.id) return;

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetchIssueEvaluation(issue.id, EVALUATION_STAGES.CRITERIA_WEIGHTING);
        const draft = response?.data?.payload?.weightsByCriterion || {};
        const normalized = normalizeDraftWeights(criterionNames, draft);
        setWeightsByCriterion(normalized);
        setInitialData(JSON.stringify(normalized));
      } catch {
        const empty = buildEmptyWeightsByCriterion(criterionNames);
        setWeightsByCriterion(empty);
        setInitialData(JSON.stringify(empty));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, issue?.id, criterionNames]);

  const handleCloseRequest = () => {
    if (JSON.stringify(weightsByCriterion) !== initialData) {
      setOpenSaveDialog(true);
      return;
    }

    setIsOpen(false);
  };

  const handleClear = () => {
    setWeightsByCriterion(buildEmptyWeightsByCriterion(criterionNames));
  };

  const handleSave = async () => {
    setLoading(true);
    setOpenSaveDialog(false);

    const payload = { weightsByCriterion };
    const response = await saveIssueEvaluation(
      issue.id,
      EVALUATION_STAGES.CRITERIA_WEIGHTING,
      payload
    );

    setLoading(false);

    if (response?.success) {
      showSnackbarAlert(response?.message || "Evaluation draft saved successfully", "success");
      setIsOpen(false);
      return;
    }

    showSnackbarAlert(response?.message || "Error saving evaluation draft", "error");
  };

  const validateSubmit = () => {
    for (const name of criterionNames) {
      const value = weightsByCriterion[name];
      if (value === "" || value === null || value === undefined) {
        return `Criterion '${name}' is required.`;
      }

      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return `Criterion '${name}' must be numeric.`;
      }

      if (numeric < 0 || numeric > 1) {
        return `Criterion '${name}' must be between 0 and 1.`;
      }
    }

    const total = sumWeights(criterionNames, weightsByCriterion);
    if (Math.abs(total - 1) > 0.001) {
      return "Weights must sum to 1.";
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateSubmit();
    if (validationError) {
      showSnackbarAlert(validationError, "error");
      return;
    }

    setLoading(true);
    setOpenSubmitDialog(false);

    const payload = {
      weightsByCriterion: Object.fromEntries(
        criterionNames.map((name) => [name, Number(weightsByCriterion[name])])
      ),
    };

    const response = await submitIssueEvaluationPayload(
      issue.id,
      EVALUATION_STAGES.CRITERIA_WEIGHTING,
      payload
    );

    setLoading(false);

    if (response?.success) {
      showSnackbarAlert(response?.message || "Evaluation submitted successfully", "success");
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
              onClick={() => {
                const validationError = validateSubmit();
                if (validationError) {
                  showSnackbarAlert(validationError, "error");
                  return;
                }
                setOpenSubmitDialog(true);
              }}
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
