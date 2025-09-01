
import { Stack, Dialog, DialogTitle, DialogContent, DialogActions, Button, Divider, IconButton, Tabs, Typography, Tab, Backdrop, DialogContentText } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import { PairwiseMatrix } from "../PairwiseMatrix/PairwiseMatrix"
import { useEffect, useState } from "react";
import { extractLeafCriteria, validatePairwiseEvaluations } from "../../utils/evaluationPairwiseMatrixDialogUtils";
import { getEvaluations, saveEvaluations, sendEvaluations } from "../../controllers/issueController";
import { CircularLoading } from "../LoadingProgress/CircularLoading";
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useAuthContext } from "../../context/auth/auth.context";
import { useSnackbarAlertContext } from "../../context/snackbarAlert/snackbarAlert.context";
import { GlassDialog } from "../../../private/activeIssues/customStyles/StyledCard";


export const EvaluationPairwiseMatrixDialog = ({ isRatingAlternatives, setIsRatingAlternatives, selectedIssue }) => {

  const { showSnackbarAlert } = useSnackbarAlertContext()

  const [currentCriterionIndex, setCurrentCriterionIndex] = useState(0);
  const [evaluations, setEvaluations] = useState({}); // Estado global para las evaluations de cada criterio
  const [openCloseDialog, setOpenCloseDialog] = useState(false);
  const [openSendEvaluationsDialog, setOpenSendEvaluationsDialog] = useState(false);
  const [initialEvaluations, setInitialEvaluations] = useState(null);
  const [collectiveEvaluations, setCollectiveEvaluations] = useState(null)
  const [loading, setLoading] = useState(false);
  const { value: { email } } = useAuthContext();

  const leafCriteria = extractLeafCriteria(selectedIssue?.criteria || []);
  const currentCriterion = leafCriteria[currentCriterionIndex] || null;
  const criterionId = currentCriterion?.name; // Identificador único para la matriz

  useEffect(() => {
    if (!isRatingAlternatives || !selectedIssue?.name) return;

    const fetchEvaluations = async () => {
      setLoading(true);
      try {
        const response = await getEvaluations(selectedIssue.name, selectedIssue.isPairwise);
        if (response.success && response.evaluations) {
          console.log("collective", response.collectiveEvaluations)
          setCollectiveEvaluations(response.collectiveEvaluations)
          const merged = mergeEvaluations(response.evaluations);
          setEvaluations(merged);
          setInitialEvaluations(JSON.stringify(merged)); // Guarda el estado inicial como JSON
        } else {
          const merged = mergeEvaluations();
          setEvaluations(merged);
          setInitialEvaluations(JSON.stringify(merged));
        }
      } catch (error) {
        console.error("Error fetching evaluations:", error);
        const merged = mergeEvaluations();
        setEvaluations(merged);
        setInitialEvaluations(JSON.stringify(merged));
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRatingAlternatives, selectedIssue]);

  const mergeEvaluations = (fetchedEvaluations) => {
    const mergedEvaluations = {};

    leafCriteria.forEach((criterion) => {
      const criterionId = criterion.name;
      const existingMatrix = fetchedEvaluations[criterionId] || [];

      mergedEvaluations[criterionId] = selectedIssue.alternatives.map((altRow) => {
        return {
          id: altRow,
          ...Object.fromEntries(
            selectedIssue.alternatives.map((altCol) => {
              if (altRow === altCol) return [altCol, 0.5]; // Diagonal con 0.5
              const existingRow = existingMatrix.find((r) => r.id === altRow);
              const value = existingRow?.[altCol] ?? ""; // Si no hay valor, usa ""
              return [altCol, value];
            })
          ),
        };
      });
    });

    return mergedEvaluations;
  };


  const handleChangeCriterion = (index) => setCurrentCriterionIndex(index)

  const updateMatrix = (updatedRows) => {
    if (!criterionId) return;
    setEvaluations((prev) => ({
      ...prev,
      [criterionId]: updatedRows,
    }));
  };

  const handleClearAllEvaluations = () => {

    // Crear un nuevo objeto con las evaluations vacías
    const clearedMatrices = {};
    const alternatives = selectedIssue?.alternatives || [];

    leafCriteria.forEach((criterion) => {
      const criterionId = criterion.name; // Identificador de la matriz
      clearedMatrices[criterionId] = alternatives.map((altRow) => {
        const row = { id: altRow };
        alternatives.forEach((altCol) => {
          row[altCol] = altRow === altCol ? 0.5 : ""; // Reiniciar valores
        });
        return row;
      });
    });

    // Actualizar el estado de evaluations
    setEvaluations(clearedMatrices);
    showSnackbarAlert("All evaluations cleared", "success");
  };

  const handleConfirmChanges = () => {
    if (JSON.stringify(evaluations) === initialEvaluations) {
      // No hubo cambios, cerrar sin preguntar
      setOpenCloseDialog(false);
      setIsRatingAlternatives(false);
    } else {
      setOpenCloseDialog(true);
    }
  };

  const handleCloseDialog = () => {
    setOpenCloseDialog(false);
    setIsRatingAlternatives(false);
  }

  const handleSaveEvaluations = async () => {

    setLoading(true)

    setOpenCloseDialog(false)

    console.log("evaluations", evaluations)

    const evaluationSaved = await saveEvaluations(selectedIssue.name, selectedIssue.isPairwise, evaluations)

    if (evaluationSaved.success) {
      setOpenCloseDialog(false);
      setIsRatingAlternatives(false);
      showSnackbarAlert("Evaluations saved successfully", "success");
    } else {
      evaluationSaved.msg && showSnackbarAlert(evaluationSaved.msg, "error");
    }

    setLoading(false)
  }

  const handleOpenSendEvaluationsDialog = async () => {
    // Validar las evaluaciones antes de dar por finalizada la evaluación
    const validation = validatePairwiseEvaluations(evaluations);

    if (!validation.valid) {
      const { criterion, message } = validation.error;

      showSnackbarAlert(`Criterion: ${criterion}, ${message}`, "error");

      // Redirigir el tab al campo vacío
      const indexOfCriterion = leafCriteria.findIndex((c) => c.name === criterion);
      if (indexOfCriterion !== -1) {
        // Actualizar el índice del tab para redirigir al criterio correspondiente
        setCurrentCriterionIndex(indexOfCriterion);
      }
    } else {
      // Si todo es válido, proceder con el envío de las tasas
      setOpenSendEvaluationsDialog(true);
    }
    setOpenSendEvaluationsDialog(true);
  };

  const handleSendEvaluations = async () => {
    setOpenSendEvaluationsDialog(false);
    setLoading(true);
    console.log(evaluations)
    const response = await sendEvaluations(selectedIssue.name, selectedIssue.isPairwise, evaluations);
    if (response.success) {
      selectedIssue.evaluated = true
      selectedIssue.participatedExperts.push(email);
      selectedIssue.acceptedButNotEvaluatedExperts = selectedIssue.acceptedButNotEvaluatedExperts.filter(filtEmail => filtEmail !== email);
      showSnackbarAlert(response.msg, "success");
      setIsRatingAlternatives(false);
    } else {
      showSnackbarAlert(response.msg, "error");
      // Redirigir el tab al campo vacío
      const indexOfCriterion = leafCriteria.findIndex((c) => c.name === response.criterion);
      if (indexOfCriterion !== -1) {
        // Actualizar el índice del tab para redirigir al criterio correspondiente
        setCurrentCriterionIndex(indexOfCriterion);
      }
    }
    setLoading(false);
  }


  return (
    <>
      {
        loading && (
          <Backdrop open={loading} sx={{ zIndex: 999999 }}>
            <CircularLoading color="secondary" size={50} height="50vh" />
          </Backdrop>
        )
      }
      <GlassDialog open={isRatingAlternatives} onClose={handleCloseDialog} fullScreen PaperProps={{ elevation: 0 }}>
        <Stack direction={"row"} sx={{ justifyContent: "space-between", alignItems: "center" }} useFlexGap>
          <DialogTitle variant="h5" sx={{ fontWeight: "bold", color: "text.primary" }}>
            {selectedIssue?.name}
          </DialogTitle>
          <DialogActions>
            <IconButton onClick={handleConfirmChanges} color="inherit" variant="outlined" sx={{ mr: 0.5 }}>
              <CloseIcon />
            </IconButton>
          </DialogActions>
        </Stack>

        <Divider />

        <DialogContent sx={{ p: 1 }}>
          <Stack spacing={3} alignItems="center" sx={{ width: "100%" }}>
            <Tabs
              value={currentCriterionIndex}
              onChange={(event, newIndex) => handleChangeCriterion(newIndex)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{ width: "100%" }}
              wrapped
              indicatorColor="secondary"
              textColor="constrastText"
            >
              {leafCriteria.map((criterion) => (
                <Tab key={criterion.name} label={criterion.name} sx={{ width: "auto", maxWidth: 300, px: 5 }} />
              ))}
            </Tabs>

            {currentCriterion && (
              <Typography variant="subtitle1" sx={{ fontStyle: "italic", color: "text.secondary" }}>
                {currentCriterion.path.join(" > ")}
              </Typography>
            )}

            {currentCriterion && (
              <Typography variant="h6" color={currentCriterion.type === "benefit" ? "success.main" : "error.main"}>
                Evaluando: {currentCriterion.name} ({currentCriterion.type})
              </Typography>
            )}

            {/* Matriz de evaluación */}
            {
              criterionId && !loading && (
                <PairwiseMatrix
                  alternatives={selectedIssue.alternatives}
                  evaluations={evaluations[criterionId] || []}
                  setEvaluations={updateMatrix}
                  collectiveEvaluations={collectiveEvaluations?.[criterionId] || []}
                />
              )
            }
            <Stack direction="row" spacing={2}>
              <IconButton
                variant="text"
                color="secondary"
                disabled={currentCriterionIndex === 0}
                onClick={() => handleChangeCriterion(currentCriterionIndex - 1)}
              >
                <ArrowBackIosIcon />
              </IconButton>
              <IconButton
                variant="text"
                color="secondary"
                disabled={currentCriterionIndex === leafCriteria.length - 1}
                onClick={() => handleChangeCriterion(currentCriterionIndex + 1)}
              >
                <ArrowForwardIosIcon />
              </IconButton>
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClearAllEvaluations} color="error">
            Clear All
          </Button>
          <Button onClick={handleOpenSendEvaluationsDialog} color="secondary">
            Send
          </Button>
        </DialogActions>
      </GlassDialog>

      {/* Diálogo de confirmación */}
      <Dialog open={openCloseDialog} onClose={() => setOpenCloseDialog(false)}>
        <DialogTitle>Do you want to save changes?</DialogTitle>
        <DialogActions>
          <Button onClick={handleSaveEvaluations} color="secondary">
            Save changes
          </Button>
          <Button onClick={handleCloseDialog} color="error">
            Exit without saving
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmación */}
      <Dialog open={openSendEvaluationsDialog} onClose={() => setOpenSendEvaluationsDialog(false)}>
        <DialogTitle>Do you want to send evaluations?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You won&apos;t be able to modify them.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSendEvaluations} color="secondary">
            Send
          </Button>
          <Button onClick={() => setOpenSendEvaluationsDialog(false)} color="error">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
