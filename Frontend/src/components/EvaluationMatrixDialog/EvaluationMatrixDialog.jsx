import { useEffect, useState, useMemo } from "react";
import {
  Stack,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  IconButton,
  Backdrop,
  DialogContentText,
  Avatar,
  Box,
  Typography,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha, useTheme } from "@mui/material/styles";

import CloseIcon from "@mui/icons-material/Close";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import ExitToAppOutlinedIcon from "@mui/icons-material/ExitToAppOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { extractLeafCriteria, validateEvaluations } from "../../utils/evaluationPairwiseMatrixDialogUtils";
import { getEvaluations, saveEvaluations, submitEvaluations } from "../../services/issue.service";
import { CircularLoading } from "../LoadingProgress/CircularLoading";
import { useSnackbarAlertContext } from "../../context/snackbarAlert/snackbarAlert.context";
import { Matrix } from "../Matrix/Matrix";
import { GlassDialog } from "../StyledComponents/GlassDialog";
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

const sectionSx = (theme) => ({
  borderRadius: 4,
  bgcolor: alpha(theme.palette.common.white, 0.03),
  border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
});

export const EvaluationMatrixDialog = ({
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
    () => extractLeafCriteria(selectedIssue?.criteria || []).map((c) => c.name),
    [selectedIssue]
  );

  const getDomain = (cell) => (cell && typeof cell === "object" && cell.domain ? cell.domain : null);

  useEffect(() => {
    if (!isRatingAlternatives || !selectedIssue?.id) return;

    const fetchEvaluations = async () => {
      setLoading(true);
      try {
        const res = await getEvaluations(selectedIssue.id);

        if (res.success && res.evaluations) {
          setCollectiveEvaluations(res.collectiveEvaluations);

          const merged = mergeEvaluations(res.evaluations);
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

    fetchEvaluations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRatingAlternatives, selectedIssue]);

  const mergeEvaluations = (fetchedEvaluations = {}) => {
    const merged = {};
    const alternatives = selectedIssue?.alternatives || [];
    const leafCriteria = extractLeafCriteria(selectedIssue?.criteria || []);

    alternatives.forEach((alt) => {
      merged[alt] = {};
      leafCriteria.forEach((criterion) => {
        const critName = criterion.name;
        merged[alt][critName] = fetchedEvaluations?.[alt]?.[critName] ?? { value: "", domain: null };
      });
    });

    return merged;
  };

  const handleClearAllEvaluations = () => {
    const alternatives = selectedIssue?.alternatives || [];
    const criteria = leafCriteriaNames;

    const cleared = {};
    alternatives.forEach((alt) => {
      cleared[alt] = {};
      criteria.forEach((crit) => {
        const prev = evaluations?.[alt]?.[crit];
        const domain = getDomain(prev);
        cleared[alt][crit] = { value: "", domain };
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
    } else {
      setOpenCloseDialog(true);
    }
  };

  const handleOpenSubmitEvaluationsDialog = async () => {
    const validation = validateEvaluations(evaluations, {
      leafCriteria: leafCriteriaNames,
      allowEmpty: false,
    });

    if (!validation.valid) {
      const { alternative, criterion, message } = validation.error;
      showSnackbarAlert(`Alternative: ${alternative}, Criterion: ${criterion}, ${message}`, "error");
    } else {
      setOpenSubmitEvaluationsDialog(true);
    }
  };

  const handleSaveEvaluations = async () => {
    const validation = validateEvaluations(evaluations, {
      leafCriteria: leafCriteriaNames,
      allowEmpty: true,
    });

    if (!validation.valid) {
      const { alternative, criterion, message } = validation.error;
      showSnackbarAlert(`Alternative: ${alternative}, Criterion: ${criterion}, ${message}`, "error");
      return;
    }

    setLoading(true);
    setOpenCloseDialog(false);

    const evaluationSaved = await saveEvaluations(selectedIssue.id, evaluations);

    if (evaluationSaved.success) {
      setOpenCloseDialog(false);
      setIsRatingAlternatives(false);
      showSnackbarAlert("Evaluations saved successfully", "success");
    } else {
      evaluationSaved.msg && showSnackbarAlert(evaluationSaved.msg, "error");
    }

    setLoading(false);
  };

  const handleSubmitEvaluations = async () => {
    setOpenSubmitEvaluationsDialog(false);
    setLoading(true);

    const res = await submitEvaluations(selectedIssue, evaluations);

    if (res.success) {
      showSnackbarAlert(res.msg, "success");
      await fetchActiveIssues();
      await fetchFinishedIssues();
      setOpenIssueDialog(false);
      setIsRatingAlternatives(false);
    } else {
      showSnackbarAlert(res.msg, "error");
    }

    setLoading(false);
  };

  return (
    <>
      {loading && (
        <Backdrop open={loading} sx={{ zIndex: 999999 }}>
          <CircularLoading color="secondary" size={50} height="50vh" />
        </Backdrop>
      )}

      <GlassDialog
        open={isRatingAlternatives}
        onClose={handleCloseDialog}
        fullScreen={isMobile}
        fullWidth
        maxWidth="lg"
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
                <TableChartOutlinedIcon />
              </Avatar>

              <Stack spacing={0.15} sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 980, lineHeight: 1.1 }}>
                  Alternative evaluation
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
                  {selectedIssue?.name}
                </Typography>
              </Stack>
            </Stack>

            <IconButton onClick={handleConfirmChanges} sx={softIconBtnSx(theme)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>

        <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.08) }} />

        <DialogContent sx={{ p: { xs: 1.5, sm: 2.2 } }}>
          <Box sx={{ ...sectionSx(theme), maxWidth: 1400, mx: "auto", p: { xs: 1, sm: 1.5 } }}>
            {selectedIssue && !loading && (
              <Matrix
                alternatives={selectedIssue.alternatives}
                criteria={leafCriteriaNames.slice().sort()}
                evaluations={evaluations}
                setEvaluations={setEvaluations}
                collectiveEvaluations={collectiveEvaluations}
              />
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.5, borderTop: `1px solid ${alpha(theme.palette.common.white, 0.08)}`, gap: 1 }}>
          <Button variant="outlined" color="error" onClick={handleClearAllEvaluations} startIcon={<DeleteSweepOutlinedIcon />}>
            Clear all
          </Button>

          <Box sx={{ flex: 1 }} />

          <Button variant="outlined" color="success" onClick={handleOpenSubmitEvaluationsDialog} startIcon={<PublishOutlinedIcon />}>
            Submit
          </Button>
        </DialogActions>
      </GlassDialog>

      {/* SAVE CONFIRM */}
      <GlassDialog open={openCloseDialog} onClose={() => setOpenCloseDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 950 }}>Save changes?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "text.secondary" }}>
            You have unsaved changes. Save as draft or exit without saving.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ gap: 1 }}>
          <Button variant="outlined" color="info" onClick={handleSaveEvaluations} startIcon={<SaveOutlinedIcon />}>
            Save draft
          </Button>
          <Button variant="outlined" color="error" onClick={handleCloseDialog} startIcon={<ExitToAppOutlinedIcon />}>
            Exit
          </Button>
        </DialogActions>
      </GlassDialog>

      {/* SUBMIT CONFIRM */}
      <GlassDialog open={openSubmitEvaluationsDialog} onClose={() => setOpenSubmitEvaluationsDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 950 }}>Submit evaluations?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "text.secondary" }}>
            You won&apos;t be able to modify them.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ gap: 1 }}>
          <Button variant="outlined" color="success" onClick={handleSubmitEvaluations} startIcon={<CheckCircleOutlineIcon />}>
            Submit
          </Button>
          <Button variant="outlined" color="warning" onClick={() => setOpenSubmitEvaluationsDialog(false)} startIcon={<CloseIcon />}>
            Cancel
          </Button>
        </DialogActions>
      </GlassDialog>
    </>
  );
};
