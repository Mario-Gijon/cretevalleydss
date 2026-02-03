import { useState, useMemo, useEffect } from "react";
import { Stack, DialogTitle, DialogContent, DialogActions, Divider, Typography, IconButton, TextField, Button, Dialog, DialogContentText, Backdrop, ToggleButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { GlassDialog } from "../StyledComponents/GlassDialog";
import { GlassPaper } from "../StyledComponents/GlassPaper";
import { CircularLoading } from "../LoadingProgress/CircularLoading";
import { getLeafCriteria } from "../../utils/createIssueUtils";
import { useSnackbarAlertContext } from "../../context/snackbarAlert/snackbarAlert.context";
import { saveManualWeights, getManualWeights, sendManualWeights } from "../../controllers/issueController";
import { useIssuesDataContext } from "../../context/issues/issues.context";

export const RateConsensusWeightsDialog = ({ handleCloseIssueDialog, isRatingWeights, setIsRatingWeights, selectedIssue, }) => {
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { fetchActiveIssues } = useIssuesDataContext();

  const leafCriteria = useMemo(
    () => getLeafCriteria(selectedIssue?.criteria || []),
    [selectedIssue]
  );

  // Estado de pesos manuales { criterio: valor }
  const [manualWeights, setManualWeights] = useState({});
  const [initialData, setInitialData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [openSendDialog, setOpenSendDialog] = useState(false);

  // Nuevo: modo de pesos iguales
  const [equalWeightsMode, setEqualWeightsMode] = useState(false);

  // Función para asignar pesos iguales
  const applyEqualWeights = () => {
    const n = leafCriteria.length;
    if (n === 0) return;

    const value = Number((1 / n).toFixed(3)); // 0.333, 0.25, 0.2...

    const equal = Object.fromEntries(
      leafCriteria.map((c) => [c.name, value])
    );

    setManualWeights(equal);
  };

  // Se aplica automáticamente cuando activamos el modo
  useEffect(() => {
    if (equalWeightsMode) {
      applyEqualWeights();
    }
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
          const empty = Object.fromEntries(
            leafCriteria.map((c) => [c.name, ""])
          );
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
    const empty = Object.fromEntries(leafCriteria.map((c) => [c.name, ""]));
    setManualWeights(empty);
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

  // Validación actualizada
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

    // 🔥 SOLO válido si estamos en modo pesos iguales
    if (equalWeightsMode && allEqual) return true;

    // ❌ Si NO estamos en equalWeightsMode → deben sumar EXACTAMENTE 1
    const sum = values.reduce((acc, v) => acc + v, 0);

    return Math.abs(sum - 1) < 0.0001;
  }, [manualWeights, leafCriteria, equalWeightsMode]);



  return (
    <>
      {/* LOADING */}
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
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <DialogTitle variant="h5" sx={{ fontWeight: "bold" }}>
            {selectedIssue?.name}
          </DialogTitle>
          <DialogActions>
            <IconButton onClick={handleConfirmClose} color="inherit">
              <CloseIcon />
            </IconButton>
          </DialogActions>
        </Stack>

        <Divider />

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Rate each criterion between 0 and 1
            </Typography>

            <Typography variant="body2" color="text.secondary">
              These values will be used in one or more consensus rounds.
            </Typography>

            <Typography variant="body2" color="info">
              All weights must sum 1 unless equal weights mode is enabled.
            </Typography>

            <Stack width="100%" alignItems="center" pt={4}>
              <Stack
                direction="row"
                flexWrap="wrap"
                gap={2}
                justifyContent="flex-start"
                sx={{ width: "fit-content" }}
              >
                {leafCriteria.map((c) => (
                  <GlassPaper
                    key={c.name}
                    sx={{
                      textAlign: "center",
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
                        sx={{ maxWidth: 85 }}
                        inputProps={{
                          min: 0,
                          max: 1,
                          step: 0.1,
                        }}
                      />
                    </Stack>
                  </GlassPaper>
                ))}
              </Stack>
              <Stack direction="row" pt={4}>
                <ToggleButton
                  value="equal"
                  selected={equalWeightsMode}
                  onChange={() => setEqualWeightsMode((prev) => !prev)}
                  color="secondary"
                  size="small"
                >
                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                    Equal weights
                  </Typography>
                </ToggleButton>

              </Stack>
            </Stack>

          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={clearAll} color="error">
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
      </GlassDialog>

      {/* DIALOGO GUARDAR */}
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
              clearAll();
            }}
            color="error"
          >
            Exit without saving
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOGO ENVIAR */}
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
