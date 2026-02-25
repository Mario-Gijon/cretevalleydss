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

import { GlassDialog } from "../StyledComponents/GlassDialog";
import { getLeafCriteria } from "../../utils/createIssueUtils";
import { useSnackbarAlertContext } from "../../context/snackbarAlert/snackbarAlert.context";
import { CircularLoading } from "../LoadingProgress/CircularLoading";
import { saveBwmWeights, getBwmWeights, sendBwmWeights } from "../../controllers/issueController";
import { useIssuesDataContext } from "../../context/issues/issues.context";

const auroraBg = (theme, intensity = 0.16) => ({
  backgroundImage: `radial-gradient(1100px 520px at 12% 0%, ${alpha(theme.palette.info.main, intensity)}, transparent 62%),
                    radial-gradient(900px 500px at 88% 14%, ${alpha(theme.palette.secondary.main, intensity)}, transparent 58%)`,
});

const softIconBtnSx = (theme) => ({
  borderRadius: 3,
  border: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
  bgcolor: alpha(theme.palette.common.white, 0.05),
  "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.08) },
});

const inputSx = (theme) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 3,
    bgcolor: alpha(theme.palette.common.white, 0.04),
  },
});

const sectionSx = (theme) => ({
  borderRadius: 4,
  p: 2,
  bgcolor: alpha(theme.palette.common.white, 0.035),
  border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
});

export const RateBwmWeightsDialog = ({
  handleCloseIssueDialog,
  isRatingWeights,
  setIsRatingWeights,
  selectedIssue,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { fetchActiveIssues } = useIssuesDataContext();

  const leafCriteria = useMemo(() => getLeafCriteria(selectedIssue?.criteria || []), [selectedIssue]);

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
    if (!isRatingWeights || !selectedIssue?.id) return;

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
        const response = await getBwmWeights(selectedIssue.name);

        if (response.success && response.bwmData) {
          setBwmData(response.bwmData);
          setInitialData(JSON.stringify(response.bwmData));
        } else {
          const empty = {
            bestCriterion: "",
            worstCriterion: "",
            bestToOthers: Object.fromEntries(leafCriteria.map((c) => [c.name, ""])),
            othersToWorst: Object.fromEntries(leafCriteria.map((c) => [c.name, ""])),
            completed: false,
          };
          setBwmData(empty);
          setInitialData(JSON.stringify(empty));
        }
      } catch (err) {
        console.error("Error fetching weights:", err);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRatingWeights, selectedIssue]);

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
    if (current !== initialData && !bwmData.completed) setOpenSaveDialog(true);
    else {
      setIsRatingWeights(false);
      handleClearAllWeights();
    }
  };

  const handleSaveWeights = async () => {
    setLoading(true);
    setOpenSaveDialog(false);

    const response = await saveBwmWeights(selectedIssue.name, bwmData);

    setLoading(false);
    if (response.success) {
      showSnackbarAlert("Weights saved successfully", "success");
      setIsRatingWeights(false);
    } else {
      showSnackbarAlert(response.msg || "Error saving weights", "error");
    }
  };

  const handleSendWeights = async () => {
    setLoading(true);
    setOpenSendDialog(false);

    const response = await sendBwmWeights(selectedIssue.name, bwmData);

    setLoading(false);
    if (response.success) {
      showSnackbarAlert("Weights submitted successfully", "success");
      handleCloseIssueDialog();
      await fetchActiveIssues();
      setIsRatingWeights(false);
    } else {
      showSnackbarAlert(response.msg || "Error submitting weights", "error");
    }
  };

  const isComplete = useMemo(() => {
    if (!bwmData.bestCriterion || !bwmData.worstCriterion) return false;
    const names = leafCriteria.map((c) => c.name);

    const bestValid = names.every((name) => {
      if (name === bwmData.bestCriterion) return true;
      const v = bwmData.bestToOthers[name];
      return v && v >= 1 && v <= 9;
    });

    const worstValid = names.every((name) => {
      if (name === bwmData.worstCriterion) return true;
      const v = bwmData.othersToWorst[name];
      return v && v >= 1 && v <= 9;
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
        {/* HEADER */}
        <Box sx={{ ...auroraBg(theme, 0.18), borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.10)}` }}>
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
                  Criteria weights (BWM)
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
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
            {/* STEP 1 */}
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
                    value={bwmData.bestCriterion}
                    onChange={(e) => setBwmData((prev) => ({ ...prev, bestCriterion: e.target.value }))}
                    sx={{ minWidth: 240, ...inputSx(theme) }}
                    disabled={isReadOnly}
                  >
                    {leafCriteria
                      .filter((c) => c.name !== bwmData.worstCriterion)
                      .map((c) => (
                        <MenuItem key={c.name} value={c.name}>
                          {c.name}
                        </MenuItem>
                      ))}
                  </TextField>

                  <TextField
                    select
                    label="Worst criterion"
                    size="small"
                    color="info"
                    value={bwmData.worstCriterion}
                    onChange={(e) => setBwmData((prev) => ({ ...prev, worstCriterion: e.target.value }))}
                    sx={{ minWidth: 240, ...inputSx(theme) }}
                    disabled={isReadOnly}
                  >
                    {leafCriteria
                      .filter((c) => c.name !== bwmData.bestCriterion)
                      .map((c) => (
                        <MenuItem key={c.name} value={c.name}>
                          {c.name}
                        </MenuItem>
                      ))}
                  </TextField>
                </Stack>
              </Stack>
            </Box>

            {/* STEP 2 */}
            {bwmData.bestCriterion && (
              <Box sx={sectionSx(theme)}>
                <Stack spacing={1.25}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
                    Step 2 — Best vs others (1–9)
                  </Typography>

                  <Stack spacing={0.25}>
                    {leafCriteria.map((c, idx) => {
                      const isBest = c.name === bwmData.bestCriterion;

                      return (
                        <Box key={c.name}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{
                              py: 1,
                              px: 0.5,
                              borderRadius: 2.5,
                              bgcolor: isBest ? alpha(theme.palette.success.main, 0.10) : "transparent",
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 900 }}>
                              {c.name}
                              {isBest ? (
                                <Typography component="span" variant="caption" sx={{ color: "success.main", fontWeight: 950 }}>
                                  {" "}
                                  • best
                                </Typography>
                              ) : null}
                            </Typography>

                            <TextField
                              type="number"
                              size="small"
                              color="info"
                              value={isBest ? 1 : bwmData.bestToOthers[c.name] ?? ""}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, "");
                                setBwmData((prev) => ({
                                  ...prev,
                                  bestToOthers: { ...prev.bestToOthers, [c.name]: val },
                                }));
                              }}
                              sx={{ width: 100, ...inputSx(theme) }}
                              inputProps={{ min: 1, max: 9 }}
                              disabled={isBest || isReadOnly}
                            />
                          </Stack>

                          {idx < leafCriteria.length - 1 && (
                            <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.08) }} />
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                </Stack>
              </Box>
            )}

            {/* STEP 3 */}
            {bwmData.worstCriterion && (
              <Box sx={sectionSx(theme)}>
                <Stack spacing={1.25}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
                    Step 3 — Others vs worst (1–9)
                  </Typography>

                  <Stack spacing={0.25}>
                    {leafCriteria.map((c, idx) => {
                      const isWorst = c.name === bwmData.worstCriterion;

                      return (
                        <Box key={c.name}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{
                              py: 1,
                              px: 0.5,
                              borderRadius: 2.5,
                              bgcolor: isWorst ? alpha(theme.palette.error.main, 0.10) : "transparent",
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 900 }}>
                              {c.name}
                              {isWorst ? (
                                <Typography component="span" variant="caption" sx={{ color: "error.main", fontWeight: 950 }}>
                                  {" "}
                                  • worst
                                </Typography>
                              ) : null}
                            </Typography>

                            <TextField
                              type="number"
                              size="small"
                              color="info"
                              value={isWorst ? 1 : bwmData.othersToWorst[c.name] ?? ""}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, "");
                                setBwmData((prev) => ({
                                  ...prev,
                                  othersToWorst: { ...prev.othersToWorst, [c.name]: val },
                                }));
                              }}
                              sx={{ width: 100, ...inputSx(theme) }}
                              inputProps={{ min: 1, max: 9 }}
                              disabled={isWorst || isReadOnly}
                            />
                          </Stack>

                          {idx < leafCriteria.length - 1 && (
                            <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.08) }} />
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

        {/* FOOTER */}
        {!isReadOnly && (
          <DialogActions sx={{ px: 2, py: 1.5, borderTop: `1px solid ${alpha(theme.palette.common.white, 0.08)}`, gap: 1 }}>
            <Button variant="outlined" color="error" onClick={handleClearAllWeights} startIcon={<DeleteSweepOutlinedIcon />}>
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

      {/* SAVE DRAFT ON CLOSE */}
      <GlassDialog open={openSaveDialog} onClose={() => setOpenSaveDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 950 }}>Save your progress?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "text.secondary" }}>
            You have unsaved changes. You can save them as a draft or exit without saving.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ gap: 1 }}>
          <Button variant="outlined" color="info" onClick={handleSaveWeights} startIcon={<SaveOutlinedIcon />}>
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

      {/* SUBMIT CONFIRM */}
      <GlassDialog open={openSendDialog} onClose={() => setOpenSendDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 950 }}>Submit your weights?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "text.secondary" }}>
            You won&apos;t be able to modify them later.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ gap: 1 }}>
          <Button variant="outlined" color="success" onClick={handleSendWeights} startIcon={<CheckCircleOutlineIcon />}>
            Submit
          </Button>
          <Button variant="outlined" color="warning" onClick={() => setOpenSendDialog(false)} startIcon={<CloseIcon />}>
            Cancel
          </Button>
        </DialogActions>
      </GlassDialog>
    </>
  );
};
