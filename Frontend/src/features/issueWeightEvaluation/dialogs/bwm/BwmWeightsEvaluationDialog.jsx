import { useState, useMemo, useEffect } from "react";
import {
  Stack,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Typography,
  IconButton,
  TextField,
  MenuItem,
  Button,
  Backdrop,
  DialogContentText,
  Avatar,
  Box,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha, useTheme } from "@mui/material/styles";

import CloseIcon from "@mui/icons-material/Close";
import TuneIcon from "@mui/icons-material/Tune";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import ExitToAppOutlinedIcon from "@mui/icons-material/ExitToAppOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import { GlassDialog } from "../../../../components/StyledComponents/GlassDialog";
import { CircularLoading } from "../../../../components/LoadingProgress/CircularLoading";
import { useSnackbarAlertContext } from "../../../../context/snackbarAlert/snackbarAlert.context";
import { useIssuesDataContext } from "../../../../context/issues/issues.context";
import {
  getBwmWeightDraft,
  saveBwmWeightDraft,
  submitBwmWeights,
} from "../../services/weightEvaluation.service.js";
import { getLeafCriteria } from "../../utils/leafCriteria.utils.js";
import {
  auroraBg,
  softIconBtnSx,
  inputSx,
  sectionSx,
} from "../../styles/weightEvaluationDialog.styles.js";

/**
 * Diálogo de evaluación BWM de pesos.
 *
 * @param {Object} props
 * @param {Function} props.handleCloseIssueDialog
 * @param {boolean} props.isRatingWeights
 * @param {Function} props.setIsRatingWeights
 * @param {Object} props.selectedIssue
 * @returns {JSX.Element}
 */
const BwmWeightsEvaluationDialog = ({
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

  const [bwmData, setBwmData] = useState({
    bestCriterion: "",
    worstCriterion: "",
    bestToOthers: {},
    othersToWorst: {},
    completed: false,
  });

  const [initialData, setInitialData] = useState(null);
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [openSendDialog, setOpenSendDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isRatingWeights || !selectedIssue?.id) {
      return;
    }

    const fetchWeights = async () => {
      setBwmData({
        bestCriterion: "",
        worstCriterion: "",
        bestToOthers: {},
        othersToWorst: {},
        completed: false,
      });

      setLoading(true);

      try {
        const response = await getBwmWeightDraft(selectedIssue.id);
        const bwmDataPayload = response?.data?.bwmData ?? null;

        if (response.success && bwmDataPayload) {
          setBwmData(bwmDataPayload);
          setInitialData(JSON.stringify(bwmDataPayload));
        } else {
          const empty = {
            bestCriterion: "",
            worstCriterion: "",
            bestToOthers: Object.fromEntries(
              leafCriteria.map((criterion) => [criterion.name, ""])
            ),
            othersToWorst: Object.fromEntries(
              leafCriteria.map((criterion) => [criterion.name, ""])
            ),
            completed: false,
          };
          setBwmData(empty);
          setInitialData(JSON.stringify(empty));
        }
      } catch (error) {
        console.error("Error fetching weights:", error);
        showSnackbarAlert("Error fetching saved weights", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchWeights();

    return () => {
      setBwmData({
        bestCriterion: "",
        worstCriterion: "",
        bestToOthers: {},
        othersToWorst: {},
        completed: false,
      });
    };
  }, [isRatingWeights, selectedIssue, leafCriteria, showSnackbarAlert]);

  const handleClearAllWeights = () => {
    setBwmData({
      bestCriterion: "",
      worstCriterion: "",
      bestToOthers: {},
      othersToWorst: {},
      completed: false,
    });
  };

  const handleConfirmClose = () => {
    const current = JSON.stringify(bwmData);

    if (current !== initialData && !bwmData.completed) {
      setOpenSaveDialog(true);
    } else {
      setIsRatingWeights(false);
      handleClearAllWeights();
    }
  };

  const handleSaveWeights = async () => {
    setLoading(true);
    setOpenSaveDialog(false);

    const response = await saveBwmWeightDraft(selectedIssue.id, bwmData);

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

    const response = await submitBwmWeights(selectedIssue.id, bwmData);

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
    if (!bwmData.bestCriterion || !bwmData.worstCriterion) {
      return false;
    }

    const names = leafCriteria.map((criterion) => criterion.name);

    const bestValid = names.every((name) => {
      if (name === bwmData.bestCriterion) {
        return true;
      }

      const value = bwmData.bestToOthers[name];
      return value && value >= 1 && value <= 9;
    });

    const worstValid = names.every((name) => {
      if (name === bwmData.worstCriterion) {
        return true;
      }

      const value = bwmData.othersToWorst[name];
      return value && value >= 1 && value <= 9;
    });

    return bestValid && worstValid;
  }, [bwmData, leafCriteria]);

  const isReadOnly = bwmData.completed;

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
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{ minWidth: 0 }}
            >
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
                  Criteria weights (BWM)
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", fontWeight: 900 }}
                >
                  {selectedIssue?.name}
                  {isReadOnly ? " • submitted" : ""}
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
          <Stack spacing={2.2} sx={{ maxWidth: 1000, mx: "auto" }}>
            <Box sx={sectionSx(theme)}>
              <Stack spacing={1.25}>
                <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
                  Step 1 — Select best and worst
                </Typography>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  flexWrap="wrap"
                >
                  <TextField
                    select
                    label="Best criterion"
                    size="small"
                    color="info"
                    value={bwmData.bestCriterion}
                    onChange={(event) =>
                      setBwmData((prev) => ({
                        ...prev,
                        bestCriterion: event.target.value,
                      }))
                    }
                    sx={{ minWidth: 240, ...inputSx(theme) }}
                    disabled={isReadOnly}
                  >
                    {leafCriteria
                      .filter((criterion) => criterion.name !== bwmData.worstCriterion)
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
                    value={bwmData.worstCriterion}
                    onChange={(event) =>
                      setBwmData((prev) => ({
                        ...prev,
                        worstCriterion: event.target.value,
                      }))
                    }
                    sx={{ minWidth: 240, ...inputSx(theme) }}
                    disabled={isReadOnly}
                  >
                    {leafCriteria
                      .filter((criterion) => criterion.name !== bwmData.bestCriterion)
                      .map((criterion) => (
                        <MenuItem key={criterion.name} value={criterion.name}>
                          {criterion.name}
                        </MenuItem>
                      ))}
                  </TextField>
                </Stack>
              </Stack>
            </Box>

            {bwmData.bestCriterion && (
              <Box sx={sectionSx(theme)}>
                <Stack spacing={1.25}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
                    Step 2 — Best vs others (1–9)
                  </Typography>

                  <Stack spacing={0.25}>
                    {leafCriteria.map((criterion, index) => {
                      const isBest = criterion.name === bwmData.bestCriterion;

                      return (
                        <Box key={criterion.name}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{
                              py: 1,
                              px: 0.5,
                              borderRadius: 2.5,
                              bgcolor: isBest
                                ? alpha(theme.palette.success.main, 0.10)
                                : "transparent",
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 900 }}>
                              {criterion.name}
                              {isBest ? (
                                <Typography
                                  component="span"
                                  variant="caption"
                                  sx={{ color: "success.main", fontWeight: 950 }}
                                >
                                  {" "}
                                  • best
                                </Typography>
                              ) : null}
                            </Typography>

                            <TextField
                              type="number"
                              size="small"
                              color="info"
                              value={isBest ? 1 : bwmData.bestToOthers[criterion.name] ?? ""}
                              onChange={(event) => {
                                const value = event.target.value.replace(/[^0-9]/g, "");

                                setBwmData((prev) => ({
                                  ...prev,
                                  bestToOthers: {
                                    ...prev.bestToOthers,
                                    [criterion.name]: value,
                                  },
                                }));
                              }}
                              sx={{ width: 100, ...inputSx(theme) }}
                              inputProps={{ min: 1, max: 9 }}
                              disabled={isBest || isReadOnly}
                            />
                          </Stack>

                          {index < leafCriteria.length - 1 && (
                            <Divider
                              sx={{ borderColor: alpha(theme.palette.common.white, 0.08) }}
                            />
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                </Stack>
              </Box>
            )}

            {bwmData.worstCriterion && (
              <Box sx={sectionSx(theme)}>
                <Stack spacing={1.25}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
                    Step 3 — Others vs worst (1–9)
                  </Typography>

                  <Stack spacing={0.25}>
                    {leafCriteria.map((criterion, index) => {
                      const isWorst = criterion.name === bwmData.worstCriterion;

                      return (
                        <Box key={criterion.name}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{
                              py: 1,
                              px: 0.5,
                              borderRadius: 2.5,
                              bgcolor: isWorst
                                ? alpha(theme.palette.error.main, 0.10)
                                : "transparent",
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 900 }}>
                              {criterion.name}
                              {isWorst ? (
                                <Typography
                                  component="span"
                                  variant="caption"
                                  sx={{ color: "error.main", fontWeight: 950 }}
                                >
                                  {" "}
                                  • worst
                                </Typography>
                              ) : null}
                            </Typography>

                            <TextField
                              type="number"
                              size="small"
                              color="info"
                              value={isWorst ? 1 : bwmData.othersToWorst[criterion.name] ?? ""}
                              onChange={(event) => {
                                const value = event.target.value.replace(/[^0-9]/g, "");

                                setBwmData((prev) => ({
                                  ...prev,
                                  othersToWorst: {
                                    ...prev.othersToWorst,
                                    [criterion.name]: value,
                                  },
                                }));
                              }}
                              sx={{ width: 100, ...inputSx(theme) }}
                              inputProps={{ min: 1, max: 9 }}
                              disabled={isWorst || isReadOnly}
                            />
                          </Stack>

                          {index < leafCriteria.length - 1 && (
                            <Divider
                              sx={{ borderColor: alpha(theme.palette.common.white, 0.08) }}
                            />
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>

        {!isReadOnly && (
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
              onClick={handleClearAllWeights}
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
        )}
      </GlassDialog>

      <GlassDialog
        open={openSaveDialog}
        onClose={() => setOpenSaveDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 950 }}>Save your progress?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "text.secondary" }}>
            You have unsaved changes. You can save them as a draft or exit without
            saving.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ gap: 1 }}>
          <Button
            variant="outlined"
            color="info"
            onClick={handleSaveWeights}
            startIcon={<SaveOutlinedIcon />}
          >
            Save draft
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              setOpenSaveDialog(false);
              setIsRatingWeights(false);
              handleClearAllWeights();
            }}
            startIcon={<ExitToAppOutlinedIcon />}
          >
            Exit
          </Button>
        </DialogActions>
      </GlassDialog>

      <GlassDialog
        open={openSendDialog}
        onClose={() => setOpenSendDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 950 }}>Submit your weights?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "text.secondary" }}>
            You won&apos;t be able to modify them later.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ gap: 1 }}>
          <Button
            variant="outlined"
            color="success"
            onClick={handleSendWeights}
            startIcon={<CheckCircleOutlineIcon />}
          >
            Submit
          </Button>
          <Button
            variant="outlined"
            color="warning"
            onClick={() => setOpenSendDialog(false)}
            startIcon={<CloseIcon />}
          >
            Cancel
          </Button>
        </DialogActions>
      </GlassDialog>
    </>
  );
};

export default BwmWeightsEvaluationDialog;
