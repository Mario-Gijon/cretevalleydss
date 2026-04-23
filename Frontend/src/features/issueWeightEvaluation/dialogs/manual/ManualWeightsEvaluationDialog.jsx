import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Stack,
  DialogContent,
  DialogActions,
  Divider,
  Typography,
  IconButton,
  TextField,
  Button,
  Backdrop,
  ToggleButton,
  Avatar,
  Box,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha, useTheme } from "@mui/material/styles";
import {
  auroraBg,
  softIconBtnSx,
  inputSx,
  sectionSx,
} from "../../styles/weightEvaluationDialog.styles.js";
import CloseIcon from "@mui/icons-material/Close";
import TollOutlinedIcon from "@mui/icons-material/TollOutlined";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import ExitToAppOutlinedIcon from "@mui/icons-material/ExitToAppOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

import { GlassDialog } from "../../../../components/StyledComponents/GlassDialog";
import { ConfirmationDialog } from "../../../../components/StyledComponents/ConfirmationDialog";
import { CircularLoading } from "../../../../components/LoadingProgress/CircularLoading";
import { useSnackbarAlertContext } from "../../../../context/snackbarAlert/snackbarAlert.context";
import { useIssuesDataContext } from "../../../../context/issues/issues.context";
import {
  getManualWeightDraft,
  saveManualWeightDraft,
  submitManualWeights,
} from "../../services/weightEvaluation.service.js";
import { getLeafCriteria } from "../../utils/leafCriteria.utils.js";

/**
 * Diálogo de evaluación manual de pesos.
 *
 * @param {Object} props
 * @param {Function} props.handleCloseIssueDialog
 * @param {boolean} props.isRatingWeights
 * @param {Function} props.setIsRatingWeights
 * @param {Object} props.selectedIssue
 * @returns {JSX.Element}
 */
const ManualWeightsEvaluationDialog = ({
  handleCloseIssueDialog,
  isRatingWeights,
  setIsRatingWeights,
  selectedIssue,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { fetchActiveIssues } = useIssuesDataContext();

  const leafCriteria = useMemo(
    () => getLeafCriteria(selectedIssue?.criteria || []),
    [selectedIssue]
  );
  const hasMultipleCriteria = leafCriteria.length > 1;

  const [manualWeights, setManualWeights] = useState({});
  const [initialData, setInitialData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [openSendDialog, setOpenSendDialog] = useState(false);

  const [equalWeightsMode, setEqualWeightsMode] = useState(false);

  const applyEqualWeights = useCallback(() => {
    const n = leafCriteria.length;
    if (n === 0) return;

    const values = [];
    let acc = 0;

    for (let i = 0; i < n; i += 1) {
      if (i < n - 1) {
        const value = Number((1 / n).toFixed(6));
        values.push(value);
        acc += value;
      } else {
        values.push(Number((1 - acc).toFixed(6)));
      }
    }

    setManualWeights(
      Object.fromEntries(leafCriteria.map((criterion, idx) => [criterion.name, values[idx]]))
    );
  }, [leafCriteria]);

  useEffect(() => {
    if (equalWeightsMode) {
      applyEqualWeights();
    }
  }, [equalWeightsMode, applyEqualWeights]);

  useEffect(() => {
    if (!isRatingWeights || !selectedIssue?.id) {
      return;
    }

    const fetchSaved = async () => {
      setLoading(true);

      try {
        const response = await getManualWeightDraft(selectedIssue.id);
        const manualWeights = response?.data?.manualWeights ?? null;

        if (response.success && manualWeights) {
          setManualWeights(manualWeights);
          setInitialData(JSON.stringify(manualWeights));
        } else {
          const empty = Object.fromEntries(
            leafCriteria.map((criterion) => [criterion.name, ""])
          );
          setManualWeights(empty);
          setInitialData(JSON.stringify(empty));
        }
      } catch (error) {
        console.error(error);
        showSnackbarAlert("Error fetching saved weights", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchSaved();
  }, [isRatingWeights, selectedIssue, leafCriteria, showSnackbarAlert]);

  const clearAll = () => {
    setManualWeights(
      Object.fromEntries(leafCriteria.map((criterion) => [criterion.name, ""]))
    );
    setEqualWeightsMode(false);
  };

  const handleConfirmClose = () => {
    const current = JSON.stringify(manualWeights);

    if (current !== initialData) {
      setOpenSaveDialog(true);
    } else {
      setIsRatingWeights(false);
      clearAll();
    }
  };

  const handleSaveWeights = async () => {
    setLoading(true);
    setOpenSaveDialog(false);

    const response = await saveManualWeightDraft(selectedIssue.id, manualWeights);

    setLoading(false);

    if (response.success) {
      showSnackbarAlert("Weights saved successfully", "success");
      setIsRatingWeights(false);
    } else {
      showSnackbarAlert(response?.message || "Error saving weights", "error");
    }
  };

  const handleSendWeights = async () => {
    setLoading(true);
    setOpenSendDialog(false);

    const response = await submitManualWeights(selectedIssue.id, manualWeights);

    setLoading(false);

    if (response.success) {
      showSnackbarAlert("Weights submitted successfully", "success");
      handleCloseIssueDialog();
      await fetchActiveIssues();
      setIsRatingWeights(false);
    } else {
      showSnackbarAlert(response?.message || "Error submitting weights", "error");
    }
  };

  const isComplete = useMemo(() => {
    const allFilled = leafCriteria.every((criterion) => {
      const value = manualWeights[criterion.name];
      if (value === "" || value === null) {
        return false;
      }

      const numericValue = Number(value);
      return numericValue >= 0 && numericValue <= 1;
    });

    if (!allFilled) {
      return false;
    }

    const values = leafCriteria.map((criterion) => Number(manualWeights[criterion.name]));
    const first = values[0];
    const allEqual = values.every((value) => Math.abs(value - first) < 0.0001);

    if (equalWeightsMode && allEqual) {
      return true;
    }

    const sum = values.reduce((acc, value) => acc + value, 0);
    return Math.abs(sum - 1) < 0.0001;
  }, [manualWeights, leafCriteria, equalWeightsMode]);

  return (
    <>
      {loading && (
        <Backdrop open={loading} sx={{ zIndex: 999999 }}>
          <CircularLoading color="secondary" size={50} height="50vh" />
        </Backdrop>
      )}

      <GlassDialog
        open={isRatingWeights}
        onClose={handleConfirmClose}
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
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2, py: 1.6 }}
          >
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
                  Consensus weights
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", fontWeight: 900 }}
                >
                  {selectedIssue?.name}
                </Typography>
              </Stack>
            </Stack>

            <IconButton onClick={handleConfirmClose} sx={softIconBtnSx(theme)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>

        <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.08) }} />

        <DialogContent
          sx={{
            p: { xs: 1.5, sm: 2.2 },
            "& .MuiInputLabel-root.Mui-focused": { color: theme.palette.info.main },
            "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(theme.palette.info.main, 0.65),
            },
          }}
        >
          <Stack spacing={2.2} sx={{ maxWidth: 900, mx: "auto" }}>
            <Box sx={sectionSx(theme)}>
              <Stack spacing={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
                  Rate each criterion between 0 and 1
                </Typography>

                {hasMultipleCriteria && (
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", fontWeight: 850 }}
                  >
                    Weights must sum 1 unless “Equal weights” is enabled.
                  </Typography>
                )}

                {hasMultipleCriteria && (
                  <Stack direction="row" justifyContent="flex-start" sx={{ pt: 0.5 }}>
                    <ToggleButton
                      value="equal"
                      selected={equalWeightsMode}
                      onChange={() => setEqualWeightsMode((prev) => !prev)}
                      size="small"
                      color="info"
                      sx={{
                        borderRadius: 999,
                        px: 1.6,
                        py: 0.6,
                        fontWeight: 950,
                        borderColor: alpha(theme.palette.common.white, 0.14),
                        bgcolor: equalWeightsMode
                          ? alpha(theme.palette.info.main, 0.14)
                          : alpha(theme.palette.common.white, 0.03),
                        "&:hover": { bgcolor: alpha(theme.palette.info.main, 0.12) },
                      }}
                    >
                      Equal weights
                    </ToggleButton>
                  </Stack>
                )}
              </Stack>
            </Box>

            <Box sx={sectionSx(theme)}>
              <Stack spacing={0.25}>
                {leafCriteria.map((criterion, index) => (
                  <Box key={criterion.name}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ py: 1, px: 0.5 }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 900 }}>
                        {criterion.name}
                      </Typography>

                      <TextField
                        type="number"
                        size="small"
                        color="info"
                        value={manualWeights[criterion.name] ?? ""}
                        disabled={equalWeightsMode}
                        onChange={(event) => {
                          let value = event.target.value;

                          if (value === "") {
                            setManualWeights((prev) => ({
                              ...prev,
                              [criterion.name]: "",
                            }));
                            return;
                          }

                          if (value === "." || value === "0.") {
                            setManualWeights((prev) => ({
                              ...prev,
                              [criterion.name]: value,
                            }));
                            return;
                          }

                          const numericValue = parseFloat(value);

                          if (isNaN(numericValue)) {
                            return;
                          }

                          if (numericValue < 0) value = 0;
                          if (numericValue > 1) value = 1;

                          setManualWeights((prev) => ({
                            ...prev,
                            [criterion.name]: value,
                          }));
                        }}
                        sx={{ width: 120, ...inputSx(theme) }}
                        inputProps={{ min: 0, max: 1, step: 0.1 }}
                      />
                    </Stack>

                    {index < leafCriteria.length - 1 && (
                      <Divider
                        sx={{ borderColor: alpha(theme.palette.common.white, 0.08) }}
                      />
                    )}
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 2,
            py: 1.5,
            borderTop: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
            gap: 1,
          }}
        >
          <Button
            variant="outlined"
            color="error"
            onClick={clearAll}
            startIcon={<DeleteSweepOutlinedIcon />}
          >
            Clear all
          </Button>

          <Box sx={{ flex: 1 }} />

          <Button
            variant="outlined"
            color="success"
            onClick={() => setOpenSendDialog(true)}
            disabled={!isComplete}
            startIcon={<PublishOutlinedIcon />}
          >
            Submit
          </Button>
        </DialogActions>
      </GlassDialog>

      <ConfirmationDialog
        open={openSaveDialog}
        onClose={() => setOpenSaveDialog(false)}
        tone="warning"
        title="Save your progress?"
        subtitle="You have unsaved changes. Save as draft or exit without saving."
        actions={[
          {
            id: "cancel-save-manual-weights",
            label: "Cancel",
            color: "secondary",
            variant: "outlined",
            icon: <CancelOutlinedIcon />,
            onClick: () => setOpenSaveDialog(false),
          },
          {
            id: "save-manual-weights-draft",
            label: "Save draft",
            color: "info",
            variant: "outlined",
            icon: <SaveOutlinedIcon />,
            onClick: handleSaveWeights,
          },
          {
            id: "exit-manual-weights",
            label: "Exit",
            color: "error",
            variant: "outlined",
            icon: <ExitToAppOutlinedIcon />,
            onClick: () => {
              setOpenSaveDialog(false);
              setIsRatingWeights(false);
              clearAll();
            },
          },
        ]}
        maxWidth="xs"
        fullWidth
      />

      <ConfirmationDialog
        open={openSendDialog}
        onClose={() => setOpenSendDialog(false)}
        tone="warning"
        title="Submit your weights?"
        subtitle="You won't be able to modify them later."
        actions={[
          {
            id: "cancel-submit-manual-weights",
            label: "Cancel",
            color: "secondary",
            variant: "outlined",
            icon: <CancelOutlinedIcon />,
            onClick: () => setOpenSendDialog(false),
          },
          {
            id: "submit-manual-weights",
            label: "Submit",
            color: "success",
            variant: "outlined",
            icon: <CheckCircleOutlineIcon />,
            autoFocus: true,
            onClick: handleSendWeights,
          },
        ]}
        maxWidth="xs"
        fullWidth
      />
    </>
  );
};

export default ManualWeightsEvaluationDialog;
