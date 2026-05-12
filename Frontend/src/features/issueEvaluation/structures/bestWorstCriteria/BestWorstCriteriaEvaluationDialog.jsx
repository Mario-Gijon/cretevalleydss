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
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import TuneIcon from "@mui/icons-material/Tune";
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

const buildEmptyPayload = (criterionNames) => ({
  bestCriterion: "",
  worstCriterion: "",
  bestToOthers: Object.fromEntries(criterionNames.map((name) => [name, ""])),
  othersToWorst: Object.fromEntries(criterionNames.map((name) => [name, ""])),
});

const normalizeDraftPayload = (criterionNames, payload = {}) => {
  const base = buildEmptyPayload(criterionNames);

  const normalized = {
    bestCriterion: typeof payload.bestCriterion === "string" ? payload.bestCriterion : "",
    worstCriterion: typeof payload.worstCriterion === "string" ? payload.worstCriterion : "",
    bestToOthers: { ...base.bestToOthers },
    othersToWorst: { ...base.othersToWorst },
  };

  for (const name of criterionNames) {
    const bestValue = payload?.bestToOthers?.[name];
    const worstValue = payload?.othersToWorst?.[name];

    normalized.bestToOthers[name] =
      bestValue === "" || bestValue === null || bestValue === undefined
        ? ""
        : Number(bestValue);

    normalized.othersToWorst[name] =
      worstValue === "" || worstValue === null || worstValue === undefined
        ? ""
        : Number(worstValue);
  }

  if (normalized.bestCriterion) {
    normalized.bestToOthers[normalized.bestCriterion] = 1;
  }

  if (normalized.worstCriterion) {
    normalized.othersToWorst[normalized.worstCriterion] = 1;
  }

  return normalized;
};

const BestWorstCriteriaEvaluationDialog = ({ issue, isOpen, setIsOpen, setOpenIssueDialog }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { fetchActiveIssues } = useIssuesDataContext();

  const leafCriteria = useMemo(() => getLeafCriteria(issue?.criteria || []), [issue?.criteria]);
  const criterionNames = useMemo(() => leafCriteria.map((criterion) => criterion.name), [leafCriteria]);

  const [bwmPayload, setBwmPayload] = useState(buildEmptyPayload(criterionNames));
  const [initialData, setInitialData] = useState(null);
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [openSubmitDialog, setOpenSubmitDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !issue?.id) return;

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetchIssueEvaluation(issue.id, EVALUATION_STAGES.CRITERIA_WEIGHTING);
        const normalized = normalizeDraftPayload(criterionNames, response?.data?.payload || {});
        setBwmPayload(normalized);
        setInitialData(JSON.stringify(normalized));
      } catch {
        const empty = buildEmptyPayload(criterionNames);
        setBwmPayload(empty);
        setInitialData(JSON.stringify(empty));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, issue?.id, criterionNames]);

  const handleCloseRequest = () => {
    if (JSON.stringify(bwmPayload) !== initialData) {
      setOpenSaveDialog(true);
      return;
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setBwmPayload(buildEmptyPayload(criterionNames));
  };

  const handleSave = async () => {
    setLoading(true);
    setOpenSaveDialog(false);

    const response = await saveIssueEvaluation(
      issue.id,
      EVALUATION_STAGES.CRITERIA_WEIGHTING,
      bwmPayload
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
    const { bestCriterion, worstCriterion, bestToOthers, othersToWorst } = bwmPayload;

    if (!bestCriterion) return "Best criterion is required.";
    if (!worstCriterion) return "Worst criterion is required.";
    if (criterionNames.length > 1 && bestCriterion === worstCriterion) {
      return "Best and worst criteria must be different.";
    }

    for (const name of criterionNames) {
      if (name !== bestCriterion) {
        const value = Number(bestToOthers[name]);
        if (!Number.isFinite(value) || value < 1 || value > 9) {
          return `Best-to-others value for '${name}' must be between 1 and 9.`;
        }
      }

      if (name !== worstCriterion) {
        const value = Number(othersToWorst[name]);
        if (!Number.isFinite(value) || value < 1 || value > 9) {
          return `Others-to-worst value for '${name}' must be between 1 and 9.`;
        }
      }
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

    const payload = normalizeDraftPayload(criterionNames, bwmPayload);
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
                <TuneIcon />
              </Avatar>
              <Stack spacing={0.15} sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 980, lineHeight: 1.1 }}>
                  BWM
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
          <Stack spacing={2.2} sx={{ maxWidth: 1000, mx: "auto" }}>
            <Box sx={sectionSx(theme)}>
              <Stack spacing={1.25}>
                <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
                  Step 1 — Select best and worst
                </Typography>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} flexWrap="wrap">
                  <TextField
                    select
                    label="Best criterion"
                    size="small"
                    color="info"
                    value={bwmPayload.bestCriterion}
                    onChange={(event) =>
                      setBwmPayload((prev) => ({
                        ...prev,
                        bestCriterion: event.target.value,
                        bestToOthers: {
                          ...prev.bestToOthers,
                          [event.target.value]: 1,
                        },
                      }))
                    }
                    sx={{ minWidth: 240, ...inputSx(theme) }}
                  >
                    {leafCriteria
                      .filter((criterion) => criterion.name !== bwmPayload.worstCriterion)
                      .map((criterion) => (
                        <MenuItem key={criterion.name} value={criterion.name}>
                          {criterion.name}
                        </MenuItem>
                      ))}
                  </TextField>

                  <TextField
                    select
                    label="Worst criterion"
                    size="small"
                    color="info"
                    value={bwmPayload.worstCriterion}
                    onChange={(event) =>
                      setBwmPayload((prev) => ({
                        ...prev,
                        worstCriterion: event.target.value,
                        othersToWorst: {
                          ...prev.othersToWorst,
                          [event.target.value]: 1,
                        },
                      }))
                    }
                    sx={{ minWidth: 240, ...inputSx(theme) }}
                  >
                    {leafCriteria
                      .filter((criterion) => criterion.name !== bwmPayload.bestCriterion)
                      .map((criterion) => (
                        <MenuItem key={criterion.name} value={criterion.name}>
                          {criterion.name}
                        </MenuItem>
                      ))}
                  </TextField>
                </Stack>
              </Stack>
            </Box>

            <Box sx={sectionSx(theme)}>
              <Stack spacing={1.2}>
                <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
                  Step 2 — Best to others (1 to 9)
                </Typography>

                {criterionNames.map((name) => (
                  <TextField
                    key={`bto-${name}`}
                    label={`${name}`}
                    type="number"
                    size="small"
                    color="info"
                    value={name === bwmPayload.bestCriterion ? 1 : bwmPayload.bestToOthers[name] ?? ""}
                    disabled={name === bwmPayload.bestCriterion}
                    onChange={(event) =>
                      setBwmPayload((prev) => ({
                        ...prev,
                        bestToOthers: {
                          ...prev.bestToOthers,
                          [name]: event.target.value === "" ? "" : Number(event.target.value),
                        },
                      }))
                    }
                    inputProps={{ min: 1, max: 9, step: 1 }}
                    sx={inputSx(theme)}
                  />
                ))}
              </Stack>
            </Box>

            <Box sx={sectionSx(theme)}>
              <Stack spacing={1.2}>
                <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
                  Step 3 — Others to worst (1 to 9)
                </Typography>

                {criterionNames.map((name) => (
                  <TextField
                    key={`otw-${name}`}
                    label={`${name}`}
                    type="number"
                    size="small"
                    color="info"
                    value={name === bwmPayload.worstCriterion ? 1 : bwmPayload.othersToWorst[name] ?? ""}
                    disabled={name === bwmPayload.worstCriterion}
                    onChange={(event) =>
                      setBwmPayload((prev) => ({
                        ...prev,
                        othersToWorst: {
                          ...prev.othersToWorst,
                          [name]: event.target.value === "" ? "" : Number(event.target.value),
                        },
                      }))
                    }
                    inputProps={{ min: 1, max: 9, step: 1 }}
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
            onClick: handleSave,
          },
        ]}
      />

      <ConfirmationDialog
        open={openSubmitDialog}
        onClose={() => setOpenSubmitDialog(false)}
        title="Submit evaluation"
        subtitle="Submit BWM evaluation now?"
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

export default BestWorstCriteriaEvaluationDialog;
