import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Backdrop,
  Box,
  Button,
  DialogActions,
  DialogContent,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import TollOutlinedIcon from "@mui/icons-material/TollOutlined";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import ExitToAppOutlinedIcon from "@mui/icons-material/ExitToAppOutlined";

import { GlassDialog } from "../../../../components/StyledComponents/GlassDialog";
import { ConfirmationDialog } from "../../../../components/StyledComponents/ConfirmationDialog";
import { CircularLoading } from "../../../../components/LoadingProgress/CircularLoading";
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
  auroraBg,
  inputSx,
  sectionSx,
  softIconBtnSx,
} from "../../styles/weightEvaluationDialog.styles";

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
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { fetchActiveIssues } = useIssuesDataContext();

  const leafCriteria = useMemo(() => getLeafCriteria(issue?.criteria || []), [issue?.criteria]);
  const criterionNames = useMemo(() => leafCriteria.map((criterion) => criterion.name), [leafCriteria]);

  const [weightsByCriterion, setWeightsByCriterion] = useState({});
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [openSubmitDialog, setOpenSubmitDialog] = useState(false);

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
      {loading && (
        <Backdrop open={loading} sx={{ zIndex: 999999 }}>
          <CircularLoading color="secondary" size={50} height="50vh" />
        </Backdrop>
      )}

      <GlassDialog
        open={isOpen}
        onClose={handleCloseRequest}
        fullScreen={isMobile}
        fullWidth
        maxWidth="md"
        PaperProps={{ elevation: 0 }}
      >
        <Box
          sx={{
            ...auroraBg(theme, 0.18),
            borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.6 }}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
              <Avatar
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: alpha(theme.palette.info.main, 0.12),
                  color: "info.main",
                  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                }}
              >
                <TollOutlinedIcon />
              </Avatar>
              <Stack spacing={0.15} sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 980, lineHeight: 1.1 }}>
                  Criteria weights
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
                  {issue?.name}
                </Typography>
              </Stack>
            </Stack>
            <IconButton onClick={handleCloseRequest} sx={softIconBtnSx(theme)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>

        <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.08) }} />

        <DialogContent sx={{ p: { xs: 1.5, sm: 2.2 } }}>
          <Stack spacing={2.2} sx={{ maxWidth: 900, mx: "auto" }}>
            <Box sx={sectionSx(theme)}>
              <Stack spacing={1.25}>
                <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
                  Rate each criterion between 0 and 1
                </Typography>

                {criterionNames.map((name) => (
                  <TextField
                    key={name}
                    label={name}
                    type="number"
                    size="small"
                    color="info"
                    value={weightsByCriterion[name] ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value;
                      setWeightsByCriterion((prev) => ({
                        ...prev,
                        [name]: raw === "" ? "" : Number(raw),
                      }));
                    }}
                    inputProps={{ min: 0, max: 1, step: 0.01 }}
                    sx={inputSx(theme)}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>

        <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.08) }} />

        <DialogActions sx={{ px: 2, py: 1.2, justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
          <Button variant="outlined" color="error" startIcon={<DeleteSweepOutlinedIcon />} onClick={handleClear}>
            Clear all
          </Button>

          <Box sx={{ flex: 1 }} />

          <Button variant="outlined" color="warning" startIcon={<SaveOutlinedIcon />} onClick={handleSave}>
            Save draft
          </Button>

          <Button variant="outlined" color="success" startIcon={<PublishOutlinedIcon />} onClick={() => setOpenSubmitDialog(true)}>
            Submit
          </Button>
        </DialogActions>
      </GlassDialog>

      <ConfirmationDialog
        open={openSaveDialog}
        onClose={() => setOpenSaveDialog(false)}
        title="Save draft"
        subtitle="You have unsaved changes. Save draft before closing?"
        tone="warning"
        actions={[
          {
            id: "exit",
            label: "Exit",
            color: "inherit",
            onClick: () => {
              setOpenSaveDialog(false);
              setIsOpen(false);
            },
          },
          {
            id: "save",
            label: "Save",
            color: "warning",
            variant: "contained",
            icon: <SaveOutlinedIcon />,
            onClick: handleSave,
          },
        ]}
      />

      <ConfirmationDialog
        open={openSubmitDialog}
        onClose={() => setOpenSubmitDialog(false)}
        title="Submit evaluation"
        subtitle="Submit criteria weights now?"
        tone="success"
        actions={[
          {
            id: "cancel",
            label: "Cancel",
            color: "inherit",
            onClick: () => setOpenSubmitDialog(false),
          },
          {
            id: "submit",
            label: "Submit",
            color: "success",
            variant: "contained",
            icon: <ExitToAppOutlinedIcon />,
            onClick: handleSubmit,
          },
        ]}
      />
    </>
  );
};

export default ManualCriteriaWeightsEvaluationDialog;
