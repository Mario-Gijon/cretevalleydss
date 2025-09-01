
import { Stack, Dialog, DialogTitle, DialogContent, DialogActions, Button, Divider, IconButton, Backdrop, DialogContentText } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import { useEffect, useState } from "react";
import { extractLeafCriteria, validateEvaluations } from "../../utils/evaluationPairwiseMatrixDialogUtils";
import { getEvaluations, saveEvaluations, sendEvaluations } from "../../controllers/issueController";
import { CircularLoading } from "../LoadingProgress/CircularLoading";
import { useAuthContext } from "../../context/auth/auth.context";
import { useSnackbarAlertContext } from "../../context/snackbarAlert/snackbarAlert.context";
import { Matrix } from "../Matrix/Matrix";
import { GlassDialog } from "../../../private/activeIssues/customStyles/StyledCard";


export const EvaluationMatrixDialog = ({ isRatingAlternatives, setIsRatingAlternatives, selectedIssue }) => {

  const { showSnackbarAlert } = useSnackbarAlertContext()

  const [evaluations, setEvaluations] = useState({}); // Estado global para las evaluations de cada criterio
  const [openCloseDialog, setOpenCloseDialog] = useState(false);
  const [openSendEvaluationsDialog, setOpenSendEvaluationsDialog] = useState(false);
  const [initialEvaluations, setInitialEvaluations] = useState(null);
  const [collectiveEvaluations, setCollectiveEvaluations] = useState(null)
  const [loading, setLoading] = useState(false);
  const { value: { email } } = useAuthContext();

  console.log(evaluations)

  useEffect(() => {
    if (!isRatingAlternatives || !selectedIssue?.name) return;

    const fetchEvaluations = async () => {
      setLoading(true);
      try {
        const response = await getEvaluations(selectedIssue.name);
        if (response.success && response.evaluations) {
          setCollectiveEvaluations(response.collectiveEvaluations);

          const merged = mergeEvaluations(response.evaluations);
          setEvaluations(merged);
          setInitialEvaluations(JSON.stringify(merged));
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


  const mergeEvaluations = (fetchedEvaluations = {}) => {
    const merged = {};

    selectedIssue.alternatives.forEach((alt) => {
      merged[alt] = {};
      extractLeafCriteria(selectedIssue.criteria || []).forEach((criterion) => {
        const critName = criterion.name;
        // Si hay evaluación guardada en DB la usamos, si no vacío
        merged[alt][critName] = fetchedEvaluations?.[alt]?.[critName] ?? "";
      });
    });

    return merged;
  };

  const handleClearAllEvaluations = () => {
    const alternatives = selectedIssue?.alternatives || [];
    const criteria = extractLeafCriteria(selectedIssue?.criteria || []).map(c => c.name);

    const cleared = {};
    alternatives.forEach((alt) => {
      cleared[alt] = {};
      criteria.forEach((crit) => {
        cleared[alt][crit] = "";
      });
    });

    setEvaluations(cleared);
    showSnackbarAlert("All evaluations cleared", "success");
  };

  const handleCloseDialog = () => {
    setOpenCloseDialog(false);
    setIsRatingAlternatives(false);
  }

  const handleConfirmChanges = () => {
    if (JSON.stringify(evaluations) === initialEvaluations) {
      // No hubo cambios, cerrar sin preguntar
      setOpenCloseDialog(false);
      setIsRatingAlternatives(false);
    } else {
      setOpenCloseDialog(true);
    }
  };

  const handleOpenSendEvaluationsDialog = async () => {
    // Validar las evaluaciones antes de dar por finalizada la evaluación
    const validation = validateEvaluations(evaluations, false);

    if (!validation.valid) {
      const { message } = validation.error;

      showSnackbarAlert(`${message}`, "error");

    } else {
      // Si todo es válido, proceder con el envío de las tasas
      setOpenSendEvaluationsDialog(true);
    }
    setOpenSendEvaluationsDialog(true);
  };

  const handleSaveEvaluations = async () => {
    setLoading(true)
    setOpenCloseDialog(false)

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

  const handleSendEvaluations = async () => {
    setOpenSendEvaluationsDialog(false);
    setLoading(true);

    const response = await sendEvaluations(selectedIssue.name, selectedIssue.isPairwise, evaluations);

    if (response.success) {
      selectedIssue.evaluated = true
      selectedIssue.participatedExperts.push(email);
      selectedIssue.acceptedButNotEvaluatedExperts = selectedIssue.acceptedButNotEvaluatedExperts.filter(filtEmail => filtEmail !== email);
      showSnackbarAlert(response.msg, "success");
      setIsRatingAlternatives(false);
    } else {
      showSnackbarAlert(response.msg, "error");
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
          <Stack sx={{ width: "100%" }} p={10} alignItems={"center"} justifyContent={"center"}>
            {/* Matriz de evaluación */}
            {
              selectedIssue && !loading && (
                <Matrix
                  alternatives={selectedIssue.alternatives} // solo hijos
                  criteria={extractLeafCriteria(selectedIssue?.criteria || []).map(c => c.name)} // solo hijos
                  evaluations={evaluations}
                  setEvaluations={setEvaluations}
                  collectiveEvaluations={collectiveEvaluations}
                />
              )
            }
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
