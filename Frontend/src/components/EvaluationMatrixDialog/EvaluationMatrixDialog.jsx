
import { Stack, Dialog, DialogTitle, DialogContent, DialogActions, Button, Divider, IconButton, Backdrop, DialogContentText } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import { useEffect, useState } from "react";
import { extractLeafCriteria, validateEvaluations } from "../../utils/evaluationPairwiseMatrixDialogUtils";
import { getEvaluations, saveEvaluations, sendEvaluations } from "../../controllers/issueController";
import { CircularLoading } from "../LoadingProgress/CircularLoading";
import { useSnackbarAlertContext } from "../../context/snackbarAlert/snackbarAlert.context";
import { Matrix } from "../Matrix/Matrix";
import { GlassDialog } from "../StyledComponents/GlassDialog";
import { useIssuesDataContext } from "../../context/issues/issues.context";

export const EvaluationMatrixDialog = ({ setOpenIssueDialog, isRatingAlternatives, setIsRatingAlternatives, selectedIssue }) => {

  const { showSnackbarAlert } = useSnackbarAlertContext()

  const { fetchActiveIssues, fetchFinishedIssues } = useIssuesDataContext();

  const [evaluations, setEvaluations] = useState({}); // Estado global para las evaluations de cada criterio
  const [openCloseDialog, setOpenCloseDialog] = useState(false);
  const [openSendEvaluationsDialog, setOpenSendEvaluationsDialog] = useState(false);
  const [initialEvaluations, setInitialEvaluations] = useState(null);
  const [collectiveEvaluations, setCollectiveEvaluations] = useState(null)
  const [loading, setLoading] = useState(false);

  const getDomain = (cell) =>
    cell && typeof cell === "object" && cell.domain ? cell.domain : null;

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

    console.log(fetchedEvaluations)

    selectedIssue.alternatives.forEach((alt) => {
      merged[alt] = {};
      extractLeafCriteria(selectedIssue.criteria || []).forEach((criterion) => {
        const critName = criterion.name;
        merged[alt][critName] = fetchedEvaluations?.[alt]?.[critName] ?? { value: "", domain: null };
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
    const leafNames = extractLeafCriteria(selectedIssue.criteria || []).map(c => c.name);

    const validation = validateEvaluations(evaluations, {
      leafCriteria: leafNames,
      allowEmpty: false, // aquí exiges que TODO esté relleno
    });

    if (!validation.valid) {
      const { alternative, criterion, message } = validation.error;
      showSnackbarAlert(`Alternative: ${alternative}, Criterion: ${criterion}, ${message}`, "error");
    } else {
      setOpenSendEvaluationsDialog(true);
    }
  };

  const handleSaveEvaluations = async () => {
    // 🔹 Si guardas como borrador, puedes permitir vacíos:
    const leafNames = extractLeafCriteria(selectedIssue.criteria || []).map(c => c.name);

    const validation = validateEvaluations(evaluations, {
      leafCriteria: leafNames,
      allowEmpty: true,
    });

    if (!validation.valid) {
      const { alternative, criterion, message } = validation.error;
      showSnackbarAlert(`Alternative: ${alternative}, Criterion: ${criterion}, ${message}`, "error");
      return;
    }

    setLoading(true);
    setOpenCloseDialog(false);

    const evaluationSaved = await saveEvaluations(selectedIssue.name, selectedIssue.isPairwise, evaluations);

    if (evaluationSaved.success) {
      setOpenCloseDialog(false);
      setIsRatingAlternatives(false);
      showSnackbarAlert("Evaluations saved successfully", "success");
    } else {
      evaluationSaved.msg && showSnackbarAlert(evaluationSaved.msg, "error");
    }

    setLoading(false);
  };

  const handleSendEvaluations = async () => {
    setOpenSendEvaluationsDialog(false);
    setLoading(true);

    const response = await sendEvaluations(selectedIssue.name, selectedIssue.isPairwise, evaluations);

    if (response.success) {
      showSnackbarAlert(response.msg, "success");
      await fetchActiveIssues();
      await fetchFinishedIssues();
      setOpenIssueDialog(false);
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
          <Stack sx={{ width: "100%" }} pt={10} alignItems={"center"} justifyContent={"center"}>
            {/* Matriz de evaluación */}
            {
              selectedIssue && !loading && (
                <Matrix
                  alternatives={selectedIssue.alternatives} // solo hijos
                  criteria={extractLeafCriteria(selectedIssue?.criteria || []).map(c => c.name).sort()} // solo hijos
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
