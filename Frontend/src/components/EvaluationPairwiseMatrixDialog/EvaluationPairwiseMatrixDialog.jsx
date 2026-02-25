import { useEffect, useMemo, useState } from "react";
import {
  Stack,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  IconButton,
  Tabs,
  Typography,
  Tab,
  Backdrop,
  DialogContentText,
  Avatar,
  Box,
  Tooltip,
  Chip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import CloseIcon from "@mui/icons-material/Close";
import GridOnOutlinedIcon from "@mui/icons-material/GridOnOutlined";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import ExitToAppOutlinedIcon from "@mui/icons-material/ExitToAppOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import { PairwiseMatrix } from "../PairwiseMatrix/PairwiseMatrix";
import { extractLeafCriteria, validatePairwiseEvaluations } from "../../utils/evaluationPairwiseMatrixDialogUtils";
import { getEvaluations, saveEvaluations, sendEvaluations } from "../../controllers/issueController";
import { CircularLoading } from "../LoadingProgress/CircularLoading";
import { useSnackbarAlertContext } from "../../context/snackbarAlert/snackbarAlert.context";
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

const pillTabsSx = (theme) => ({
  width: "100%",
  "& .MuiTabs-flexContainer": { gap: 8, padding: 6 },
  "& .MuiTabs-indicator": { display: "none" },
  "& .MuiTab-root": {
    textTransform: "none",
    fontWeight: 900,
    borderRadius: 999,
    minHeight: 36,
    minWidth: 120,
    paddingInline: 14,
    border: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
    bgcolor: alpha(theme.palette.common.white, 0.03),
    color: theme.palette.text.secondary,
  },
  "& .MuiTab-root.Mui-selected": {
    color: theme.palette.info.main,
    borderColor: alpha(theme.palette.info.main, 0.35),
    bgcolor: alpha(theme.palette.info.main, 0.12),
  },
});

const sectionSx = (theme) => ({
  borderRadius: 4,
  bgcolor: alpha(theme.palette.common.white, 0.03),
  border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
});

const metaChipSx = (theme) => ({
  borderRadius: 999,
  bgcolor: alpha(theme.palette.common.white, 0.04),
  borderColor: alpha(theme.palette.common.white, 0.08),
  "& .MuiChip-label": { fontWeight: 850 },
});

export const EvaluationPairwiseMatrixDialog = ({
  setOpenIssueDialog,
  isRatingAlternatives,
  setIsRatingAlternatives,
  selectedIssue,
}) => {
  const theme = useTheme();
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { fetchActiveIssues, fetchFinishedIssues } = useIssuesDataContext();

  const [currentCriterionIndex, setCurrentCriterionIndex] = useState(0);
  const [evaluations, setEvaluations] = useState({});
  const [openCloseDialog, setOpenCloseDialog] = useState(false);
  const [openSendEvaluationsDialog, setOpenSendEvaluationsDialog] = useState(false);
  const [initialEvaluations, setInitialEvaluations] = useState(null);
  const [collectiveEvaluations, setCollectiveEvaluations] = useState(null);
  const [loading, setLoading] = useState(false);

  const leafCriteria = useMemo(
    () => extractLeafCriteria(selectedIssue?.criteria || []),
    [selectedIssue]
  );

  const hasMultipleCriteria = leafCriteria.length > 1;

  // 🔒 Evita índices fuera de rango al cambiar issue / criterios
  useEffect(() => {
    setCurrentCriterionIndex(0);
  }, [selectedIssue?.id, leafCriteria.length]);

  const currentCriterion = leafCriteria[currentCriterionIndex] || leafCriteria[0] || null;
  const criterionId = currentCriterion?.name;

  useEffect(() => {
    if (!isRatingAlternatives || !selectedIssue?.id) return;

    const fetchEvaluations = async () => {
      setLoading(true);
      try {
        const response = await getEvaluations(selectedIssue.id, selectedIssue.isPairwise);
        if (response.success && response.evaluations) {
          setCollectiveEvaluations(response.collectiveEvaluations);
          const merged = mergeEvaluations(response.evaluations);
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

  // ✅ Mantener diagonal 0.5 siempre
  const mergeEvaluations = (fetchedEvaluations = {}) => {
    const mergedEvaluations = {};
    const alternatives = selectedIssue?.alternatives || [];

    leafCriteria.forEach((criterion) => {
      const critId = criterion.name;
      const existingMatrix = fetchedEvaluations?.[critId] || [];

      mergedEvaluations[critId] = alternatives.map((altRow) => ({
        id: altRow,
        ...Object.fromEntries(
          alternatives.map((altCol) => {
            if (altRow === altCol) return [altCol, 0.5];
            const existingRow = existingMatrix.find((r) => r.id === altRow);
            const value = existingRow?.[altCol] ?? "";
            return [altCol, value];
          })
        ),
      }));
    });

    return mergedEvaluations;
  };

  const handleChangeCriterion = (index) => setCurrentCriterionIndex(index);

  const updateMatrix = (updatedRows) => {
    if (!criterionId) return;
    setEvaluations((prev) => ({ ...prev, [criterionId]: updatedRows }));
  };

  const handleClearAllEvaluations = () => {
    const clearedMatrices = {};
    const alternatives = selectedIssue?.alternatives || [];

    leafCriteria.forEach((criterion) => {
      const critId = criterion.name;
      clearedMatrices[critId] = alternatives.map((altRow) => {
        const row = { id: altRow };
        alternatives.forEach((altCol) => {
          row[altCol] = altRow === altCol ? 0.5 : "";
        });
        return row;
      });
    });

    setEvaluations(clearedMatrices);
    showSnackbarAlert("All evaluations cleared", "success");
  };

  const handleConfirmChanges = () => {
    if (JSON.stringify(evaluations) === initialEvaluations) {
      setOpenCloseDialog(false);
      setIsRatingAlternatives(false);
    } else {
      setOpenCloseDialog(true);
    }
  };

  const handleCloseDialog = () => {
    setOpenCloseDialog(false);
    setIsRatingAlternatives(false);
  };

  const handleSaveEvaluations = async () => {
    const leafNames = extractLeafCriteria(selectedIssue.criteria || []).map((c) => c.name);

    const validation = validatePairwiseEvaluations(evaluations, {
      leafCriteria: leafNames,
      allowEmpty: true,
    });

    if (!validation.valid) {
      const { criterion, row, col, message } = validation.error;
      showSnackbarAlert(`Criterion: ${criterion}, Row: ${row}, Col: ${col}, ${message}`, "error");

      const idx = leafCriteria.findIndex((c) => c.name === criterion);
      if (idx !== -1) setCurrentCriterionIndex(idx);
      return;
    }

    setLoading(true);
    setOpenCloseDialog(false);

    const evaluationSaved = await saveEvaluations(selectedIssue.id, selectedIssue.isPairwise, evaluations);

    if (evaluationSaved.success) {
      setOpenCloseDialog(false);
      setIsRatingAlternatives(false);
      showSnackbarAlert("Evaluations saved successfully", "success");
    } else {
      evaluationSaved.msg && showSnackbarAlert(evaluationSaved.msg, "error");
    }

    setLoading(false);
  };

  const handleOpenSendEvaluationsDialog = async () => {
    const leafNames = extractLeafCriteria(selectedIssue.criteria || []).map((c) => c.name);

    const validation = validatePairwiseEvaluations(evaluations, {
      leafCriteria: leafNames,
      allowEmpty: false,
    });

    if (!validation.valid) {
      const { criterion, row, col, message } = validation.error;
      showSnackbarAlert(`Criterion: ${criterion}, Row: ${row}, Col: ${col}, ${message}`, "error");

      const idx = leafCriteria.findIndex((c) => c.name === criterion);
      if (idx !== -1) setCurrentCriterionIndex(idx);
    } else {
      setOpenSendEvaluationsDialog(true);
    }
  };

  const handleSendEvaluations = async () => {
    setOpenSendEvaluationsDialog(false);
    setLoading(true);

    const response = await sendEvaluations(selectedIssue.id, selectedIssue.isPairwise, evaluations);

    if (response.success) {
      showSnackbarAlert(response.msg, "success");
      await fetchActiveIssues();
      await fetchFinishedIssues();
      setOpenIssueDialog(false);
      setIsRatingAlternatives(false);
    } else {
      showSnackbarAlert(response.msg, "error");
      const idx = leafCriteria.findIndex((c) => c.name === response.criterion);
      if (idx !== -1) setCurrentCriterionIndex(idx);
    }
    setLoading(false);
  };

  const criterionMeta = useMemo(() => {
    if (!currentCriterion) return null;
    const typeLabel = currentCriterion.type ? String(currentCriterion.type) : "";
    const pathLabel = Array.isArray(currentCriterion.path) ? currentCriterion.path.join(" > ") : "";
    return { name: currentCriterion.name, typeLabel, pathLabel };
  }, [currentCriterion]);

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
                <GridOnOutlinedIcon />
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

        <DialogContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack spacing={1.25} sx={{ maxWidth: 1200, mx: "auto" }}>
            {/* ✅ Tabs SOLO si hay más de 1 criterio hoja */}
            {hasMultipleCriteria && (
              <Box sx={{ ...sectionSx(theme), overflow: "hidden" }}>
                <Tabs
                  value={currentCriterionIndex}
                  onChange={(event, newIndex) => handleChangeCriterion(newIndex)}
                  variant="scrollable"
                  scrollButtons="auto"
                  allowScrollButtonsMobile
                  sx={pillTabsSx(theme)}
                >
                  {leafCriteria.map((criterion) => (
                    <Tab key={criterion.name} label={criterion.name} />
                  ))}
                </Tabs>
              </Box>
            )}

            {/* ✅ Procedencia/metadata SOLO si hay más de 1 criterio hoja */}
            {hasMultipleCriteria && criterionMeta && (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
                sx={{ px: 0.25 }}
              >
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Chip
                    size="small"
                    variant="outlined"
                    color="info"
                    label={`Criterion: ${criterionMeta.name}`}
                    sx={metaChipSx(theme)}
                  />
                  {criterionMeta.typeLabel && (
                    <Chip
                      size="small"
                      variant="outlined"
                      color={criterionMeta.typeLabel === "benefit" ? "success" : "error"}
                      label={`Type: ${criterionMeta.typeLabel}`}
                      sx={metaChipSx(theme)}
                    />
                  )}
                </Stack>

                {criterionMeta.pathLabel && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 850,
                      maxWidth: { xs: "100%", sm: 520 },
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={criterionMeta.pathLabel}
                  >
                    {criterionMeta.pathLabel}
                  </Typography>
                )}
              </Stack>
            )}

            {/* ✅ Si SOLO hay 1 criterio, una línea mínima (no redundante) */}
            {!hasMultipleCriteria && criterionMeta && (
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850, px: 0.25 }}>
                {criterionMeta.name}
                {criterionMeta.typeLabel ? ` · ${criterionMeta.typeLabel}` : ""}
              </Typography>
            )}

            {/* Matrix container */}
            <Box sx={{ ...sectionSx(theme), p: { xs: 1, sm: 1.25 } }}>
              {criterionId && !loading && (
                <PairwiseMatrix
                  alternatives={selectedIssue.alternatives}
                  evaluations={evaluations[criterionId] || []}
                  setEvaluations={updateMatrix}
                  collectiveEvaluations={collectiveEvaluations?.[criterionId] || []}
                />
              )}
            </Box>

            {/* ✅ Navegación SOLO si hay más de 1 criterio hoja */}
            {hasMultipleCriteria && (
              <Stack direction="row" spacing={1} justifyContent="center">
                <Tooltip title="Previous criterion" arrow>
                  <span>
                    <IconButton
                      disabled={currentCriterionIndex === 0}
                      onClick={() => handleChangeCriterion(currentCriterionIndex - 1)}
                      sx={softIconBtnSx(theme)}
                    >
                      <ArrowBackIosIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>

                <Tooltip title="Next criterion" arrow>
                  <span>
                    <IconButton
                      disabled={currentCriterionIndex === leafCriteria.length - 1}
                      onClick={() => handleChangeCriterion(currentCriterionIndex + 1)}
                      sx={softIconBtnSx(theme)}
                    >
                      <ArrowForwardIosIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            )}
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
            onClick={handleClearAllEvaluations}
            startIcon={<DeleteSweepOutlinedIcon />}
          >
            Clear all
          </Button>

          <Box sx={{ flex: 1 }} />

          <Button
            variant="outlined"
            color="success"
            onClick={handleOpenSendEvaluationsDialog}
            startIcon={<PublishOutlinedIcon />}
          >
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

      {/* SEND CONFIRM */}
      <GlassDialog open={openSendEvaluationsDialog} onClose={() => setOpenSendEvaluationsDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 950 }}>Submit evaluations?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "text.secondary" }}>
            You won&apos;t be able to modify them.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ gap: 1 }}>
          <Button variant="outlined" color="success" onClick={handleSendEvaluations} startIcon={<CheckCircleOutlineIcon />}>
            Submit
          </Button>
          <Button variant="outlined" color="warning" onClick={() => setOpenSendEvaluationsDialog(false)} startIcon={<CloseIcon />}>
            Cancel
          </Button>
        </DialogActions>
      </GlassDialog>
    </>
  );
};
