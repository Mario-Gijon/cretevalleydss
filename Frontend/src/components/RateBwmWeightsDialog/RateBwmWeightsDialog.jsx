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
  Dialog,
  DialogContentText,
  Backdrop,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { GlassDialog } from "../StyledComponents/GlassDialog";
import { getLeafCriteria } from "../../utils/createIssueUtils";
import { GlassPaper } from "../StyledComponents/GlassPaper";
import { useSnackbarAlertContext } from "../../context/snackbarAlert/snackbarAlert.context";
import { CircularLoading } from "../LoadingProgress/CircularLoading";
import { saveBwmWeights, getBwmWeights, sendBwmWeights } from "../../controllers/issueController";
import { useIssuesDataContext } from "../../context/issues/issues.context";

export const RateBwmWeightsDialog = ({ handleCloseIssueDialog, isRatingWeights, setIsRatingWeights, selectedIssue }) => {
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

  // 🔹 Cargar los pesos guardados cuando el usuario abre el diálogo
  useEffect(() => {
    if (!isRatingWeights || !selectedIssue?.name) return;

    const fetchWeights = async () => {
      // 🧹 Limpiar inmediatamente el estado para evitar mostrar datos antiguos
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

    // 🧼 Limpieza opcional: al cerrar o cambiar de issue, limpiar estado
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

  // 🔹 Limpiar todos los valores
  const handleClearAllWeights = () => {
    setBwmData({
      bestCriterion: "",
      worstCriterion: "",
      bestToOthers: {},
      othersToWorst: {},
      completed: false,
    });
  };

  // 🔹 Confirmar cierre (si hay cambios)
  const handleConfirmClose = () => {
    const current = JSON.stringify(bwmData);
    if (current !== initialData && !bwmData.completed) {
      setOpenSaveDialog(true);
    } else {
      setIsRatingWeights(false);
      handleClearAllWeights();
    }
  };

  // 🔹 Guardar como borrador
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
      handleCloseIssueDialog()
      await fetchActiveIssues(); // 🔥 actualiza lista completa
      setIsRatingWeights(false);
    } else {
      showSnackbarAlert(response.msg || "Error submitting weights", "error");
    }
  };


  // 🔹 Validar si ya están todos los valores rellenados
  const isComplete = useMemo(() => {
    if (!bwmData.bestCriterion || !bwmData.worstCriterion) return false;
    const criteriaNames = leafCriteria.map((c) => c.name);

    const bestValid = criteriaNames.every((name) => {
      if (name === bwmData.bestCriterion) return true;
      return (
        bwmData.bestToOthers[name] &&
        bwmData.bestToOthers[name] >= 1 &&
        bwmData.bestToOthers[name] <= 9
      );
    });

    const worstValid = criteriaNames.every((name) => {
      if (name === bwmData.worstCriterion) return true;
      return (
        bwmData.othersToWorst[name] &&
        bwmData.othersToWorst[name] >= 1 &&
        bwmData.othersToWorst[name] <= 9
      );
    });

    return bestValid && worstValid;
  }, [bwmData, leafCriteria]);

  const isReadOnly = bwmData.completed; // 🔒 modo solo lectura

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
        fullScreen
        PaperProps={{ elevation: 0 }}
      >
        {/* HEADER */}
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <DialogTitle variant="h5" sx={{ fontWeight: "bold", color: "text.primary" }}>
            Criteria Weight Evaluation – {selectedIssue?.name}
          </DialogTitle>
          <DialogActions>
            <IconButton onClick={handleConfirmClose} color="inherit" sx={{ mr: 1 }}>
              <CloseIcon />
            </IconButton>
          </DialogActions>
        </Stack>

        <Divider />

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={5}>
            {/* === STEP 1 === */}
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Step 1: Select Best and Worst criteria
              </Typography>

              <Stack direction="row" spacing={3} flexWrap="wrap">
                <TextField
                  select
                  label="Best criterion"
                  size="small"
                  color="info"
                  value={bwmData.bestCriterion}
                  onChange={(e) =>
                    setBwmData((prev) => ({ ...prev, bestCriterion: e.target.value }))
                  }
                  sx={{ minWidth: 150 }}
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
                  onChange={(e) =>
                    setBwmData((prev) => ({ ...prev, worstCriterion: e.target.value }))
                  }
                  sx={{ minWidth: 150 }}
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

            {/* === STEP 2 === */}
            {bwmData.bestCriterion && (
              <Stack spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  Step 2: Compare Best with Others (1–9)
                </Typography>

                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {leafCriteria.map((c) => {
                    const isBest = c.name === bwmData.bestCriterion;
                    return (
                      <GlassPaper
                        key={c.name}
                        sx={{
                          textAlign: "center",
                          backgroundColor: isBest && "rgba(42, 119, 44, 0.15)",
                          borderRadius: 3,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        }}
                      >
                        <Stack p={1.5} px={2} spacing={1} alignItems="center">
                          <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                            {c.name}
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
                            sx={{ maxWidth: 65 }}
                            inputProps={{ min: 1, max: 9 }}
                            disabled={isBest || isReadOnly}
                          />
                        </Stack>
                      </GlassPaper>
                    );
                  })}
                </Stack>
              </Stack>
            )}

            {/* === STEP 3 === */}
            {bwmData.worstCriterion && (
              <Stack spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  Step 3: Compare Others with Worst (1–9)
                </Typography>

                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {leafCriteria.map((c) => {
                    const isWorst = c.name === bwmData.worstCriterion;
                    return (
                      <GlassPaper
                        key={c.name}
                        sx={{
                          textAlign: "center",
                          backgroundColor: isWorst && "rgba(164, 54, 46, 0.28)",
                          borderRadius: 3,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        }}
                      >
                        <Stack p={1.5} px={2} spacing={1} alignItems="center">
                          <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                            {c.name}
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
                            inputProps={{ min: 1, max: 9 }}
                            sx={{ maxWidth: 65 }}
                            disabled={isWorst || isReadOnly}
                          />
                        </Stack>
                      </GlassPaper>
                    );
                  })}
                </Stack>
              </Stack>
            )}
          </Stack>
        </DialogContent>

        {/* === FOOTER === */}
        {!isReadOnly && (
          <DialogActions>
            <Button onClick={handleClearAllWeights} color="error">
              Clear All
            </Button>

            <Button
              onClick={() => setOpenSendDialog(true)}
              color="secondary"
              disabled={!isComplete}
            >
              Send
            </Button>
          </DialogActions>
        )}
      </GlassDialog>

      {/* 💾 Guardar al cerrar */}
      <Dialog open={openSaveDialog} onClose={() => setOpenSaveDialog(false)}>
        <DialogTitle>Do you want to save your progress?</DialogTitle>
        <DialogActions>
          <Button onClick={handleSaveWeights} color="secondary">
            Save changes
          </Button>
          <Button
            onClick={() => {
              setOpenSaveDialog(false);
              setIsRatingWeights(false);
              handleClearAllWeights();
            }}
            color="error"
          >
            Exit without saving
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🚀 Enviar definitiva */}
      <Dialog open={openSendDialog} onClose={() => setOpenSendDialog(false)}>
        <DialogTitle>Do you want to submit your weights?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You won&apos;t be able to modify them later.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSendWeights} color="secondary">
            Send
          </Button>
          <Button onClick={() => setOpenSendDialog(false)} color="error">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
