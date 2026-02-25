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
  Button,
  Backdrop,
  DialogContentText,
  ToggleButton,
  Avatar,
  Box,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha, useTheme } from "@mui/material/styles";

import CloseIcon from "@mui/icons-material/Close";
import TollOutlinedIcon from "@mui/icons-material/TollOutlined";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import ExitToAppOutlinedIcon from "@mui/icons-material/ExitToAppOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import { GlassDialog } from "../StyledComponents/GlassDialog";
import { CircularLoading } from "../LoadingProgress/CircularLoading";
import { getLeafCriteria } from "../../utils/createIssueUtils";
import { useSnackbarAlertContext } from "../../context/snackbarAlert/snackbarAlert.context";
import { saveManualWeights, getManualWeights, sendManualWeights } from "../../controllers/issueController";
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

export const RateConsensusWeightsDialog = ({
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
  const hasMultipleCriteria = leafCriteria.length > 1;

  const [manualWeights, setManualWeights] = useState({});
  const [initialData, setInitialData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [openSendDialog, setOpenSendDialog] = useState(false);

  const [equalWeightsMode, setEqualWeightsMode] = useState(false);

  const applyEqualWeights = () => {
    const n = leafCriteria.length;
    if (n === 0) return;
    const value = Number((1 / n).toFixed(3));
    setManualWeights(Object.fromEntries(leafCriteria.map((c) => [c.name, value])));
  };

  useEffect(() => {
    if (equalWeightsMode) applyEqualWeights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equalWeightsMode, leafCriteria]);

  useEffect(() => {
    if (!isRatingWeights || !selectedIssue?.name) return;

    const fetchSaved = async () => {
      setLoading(true);
      try {
        const response = await getManualWeights(selectedIssue.name);

        if (response.success && response.manualWeights) {
          setManualWeights(response.manualWeights);
          setInitialData(JSON.stringify(response.manualWeights));
        } else {
          const empty = Object.fromEntries(leafCriteria.map((c) => [c.name, ""]));
          setManualWeights(empty);
          setInitialData(JSON.stringify(empty));
        }
      } catch (err) {
        console.error(err);
        showSnackbarAlert("Error fetching saved weights", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchSaved();
  }, [isRatingWeights, selectedIssue, leafCriteria, showSnackbarAlert]);

  const clearAll = () => {
    setManualWeights(Object.fromEntries(leafCriteria.map((c) => [c.name, ""])));
    setEqualWeightsMode(false);
  };

  const handleConfirmClose = () => {
    const current = JSON.stringify(manualWeights);
    if (current !== initialData) setOpenSaveDialog(true);
    else {
      setIsRatingWeights(false);
      clearAll();
    }
  };

  const handleSaveWeights = async () => {
    setLoading(true);
    setOpenSaveDialog(false);

    const response = await saveManualWeights(selectedIssue.name, { manualWeights });

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

    const response = await sendManualWeights(selectedIssue.name, { manualWeights });

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
    const allFilled = leafCriteria.every((c) => {
      const val = manualWeights[c.name];
      if (val === "" || val === null) return false;
      const num = Number(val);
      return num >= 0 && num <= 1;
    });
    if (!allFilled) return false;

    const values = leafCriteria.map((c) => Number(manualWeights[c.name]));
    const first = values[0];
    const allEqual = values.every((v) => Math.abs(v - first) < 0.0001);

    if (equalWeightsMode && allEqual) return true;

    const sum = values.reduce((acc, v) => acc + v, 0);
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
                <TollOutlinedIcon />
              </Avatar>

              <Stack spacing={0.15} sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 980, lineHeight: 1.1 }}>
                  Consensus weights
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
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
            {/* Intro / toggle */}
            <Box sx={sectionSx(theme)}>
              <Stack spacing={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
                  Rate each criterion between 0 and 1
                </Typography>
                {hasMultipleCriteria && (
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
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
                        bgcolor: equalWeightsMode ? alpha(theme.palette.info.main, 0.14) : alpha(theme.palette.common.white, 0.03),
                        "&:hover": { bgcolor: alpha(theme.palette.info.main, 0.12) },
                      }}
                    >
                      Equal weights
                    </ToggleButton>
                  </Stack>
                )}
              </Stack>
            </Box>

            {/* Inputs list - calm, no boxes per row */}
            <Box sx={sectionSx(theme)}>
              <Stack spacing={0.25}>
                {leafCriteria.map((c, idx) => (
                  <Box key={c.name}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1, px: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 900 }}>
                        {c.name}
                      </Typography>

                      <TextField
                        type="number"
                        size="small"
                        color="info"
                        value={manualWeights[c.name] ?? ""}
                        disabled={equalWeightsMode}
                        onChange={(e) => {
                          let val = e.target.value;

                          if (val === "") {
                            setManualWeights((prev) => ({ ...prev, [c.name]: "" }));
                            return;
                          }
                          if (val === "." || val === "0.") {
                            setManualWeights((prev) => ({ ...prev, [c.name]: val }));
                            return;
                          }

                          const num = parseFloat(val);
                          if (isNaN(num)) return;
                          if (num < 0) val = 0;
                          if (num > 1) val = 1;

                          setManualWeights((prev) => ({ ...prev, [c.name]: val }));
                        }}
                        sx={{ width: 120, ...inputSx(theme) }}
                        inputProps={{ min: 0, max: 1, step: 0.1 }}
                      />
                    </Stack>

                    {idx < leafCriteria.length - 1 && (
                      <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.08) }} />
                    )}
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>

        {/* FOOTER */}
        <DialogActions sx={{ px: 2, py: 1.5, borderTop: `1px solid ${alpha(theme.palette.common.white, 0.08)}`, gap: 1 }}>
          <Button variant="outlined" color="error" onClick={clearAll} startIcon={<DeleteSweepOutlinedIcon />}>
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

      {/* SAVE ON CLOSE */}
      <GlassDialog open={openSaveDialog} onClose={() => setOpenSaveDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 950 }}>Save your progress?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "text.secondary" }}>
            You have unsaved changes. Save as draft or exit without saving.
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
              clearAll();
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
