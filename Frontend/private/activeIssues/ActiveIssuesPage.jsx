import { useEffect, useState } from "react";
import { Stack, Typography, CardContent, CardActionArea, Dialog, DialogTitle, DialogActions, Button, Box, Backdrop, DialogContent } from "@mui/material";
import Masonry from "@mui/lab/Masonry";
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

import { GlassCard, StyledChip } from "./customStyles/StyledCard";
import { useIssuesDataContext } from "../../src/context/issues/issues.context";
import { CircularLoading } from "../../src/components/LoadingProgress/CircularLoading";
import { editExperts, leaveIssue, removeIssue, resolveIssue } from "../../src/controllers/issueController";
import { IssueDialog } from "../../src/components/IssueDialog/IssueDialog";
import { EvaluationPairwiseMatrixDialog } from "../../src/components/EvaluationPairwiseMatrixDialog/EvaluationPairwiseMatrixDialog";
import { useSnackbarAlertContext } from "../../src/context/snackbarAlert/snackbarAlert.context";
import { ExpertsStep } from "../createIssue/Steps/ExpertsStep/ExpertsStep";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { EvaluationMatrixDialog } from "../../src/components/EvaluationMatrixDialog/EvaluationMatrixDialog";

dayjs.extend(utc);


const ActiveIssuesPage = () => {

  const { showSnackbarAlert } = useSnackbarAlertContext()

  const [selectedIssue, setSelectedIssue] = useState(null);
  const [openIssueDialog, setOpenIssueDialog] = useState(false);
  const [openRemoveConfirmDialog, setOpenRemoveConfirmDialog] = useState(false);
  const [isEditingExperts, setIsEditingExperts] = useState(false);
  const [isRatingAlternatives, setIsRatingAlternatives] = useState(false)
  const [openResolveConfirmDialog, setOpenResolveConfirmDialog] = useState(false);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [expertsToRemove, setExpertsToRemove] = useState([]);
  const [openConfirmEditExpertsDialog, setOpenConfirmEditExpertsDialog] = useState(false);
  const [openAddExpertsDialog, setOpenAddExpertsDialog] = useState(false);
  const [expertsToAdd, setExpertsToAdd] = useState([]); // lista provisional de emails
  const [hoveredChip, setHoveredChip] = useState(null);
  const [editExpertsLoading, setEditExpertsLoading] = useState(false);
  const [openLeaveConfirmDialog, setOpenLeaveConfirmDialog] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);

  const { issueCreated, setIssueCreated, initialExperts, loading, setLoading, activeIssues, setActiveIssues, fetchActiveIssues, fetchFinishedIssues } = useIssuesDataContext();

  // Obtenemos los correos de los expertos que ya están en el issue
  const existingExpertEmails = [
    ...(selectedIssue?.participatedExperts || []),
    ...(selectedIssue?.acceptedButNotEvaluatedExperts || []),
    ...(selectedIssue?.pendingExperts || []),
    ...(selectedIssue?.notAcceptedExperts || []),
    ...expertsToAdd, // opcional: para evitar que se repitan en la tabla
  ];

  // Filtramos los disponibles
  const availableExperts = initialExperts.filter(
    (expert) => !existingExpertEmails.includes(expert.email)
  );

  console.log(selectedIssue)


  useEffect(() => {
    if (issueCreated.success) {
      showSnackbarAlert(issueCreated.msg, "success");
      setIssueCreated("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueCreated, setIssueCreated]);

  const handleRemoveIssue = async () => {
    setRemoveLoading(true)
    const issueRemoved = await removeIssue(selectedIssue.name);

    if (issueRemoved.success) {
      setActiveIssues(prevIssues => prevIssues.filter(issue => issue.name !== selectedIssue.name));
      handleCloseIssueDialog();
    }
    setRemoveLoading(false)
    showSnackbarAlert(issueRemoved.msg, issueRemoved.success ? "success" : "error");
    setOpenRemoveConfirmDialog(false)
  }

  const handleDeleteExpert = (expert) => {
    setExpertsToRemove(prev => [...new Set([...prev, expert])]); // evita duplicados
  }

  const handleAddExpert = () => {
    setOpenAddExpertsDialog(true);
  };


  const handleEditExperts = () => {
    console.log("Editing experts for issue: ", isEditingExperts);
    if (isEditingExperts) {
      if (expertsToRemove.length > 0 || expertsToAdd.length > 0) {
        setOpenConfirmEditExpertsDialog(true); // Mostrar diálogo
      } else {
        setIsEditingExperts(false); // Salir sin cambios
      }
      setHoveredChip(null); // Limpiar el chip hover
    } else {
      setIsEditingExperts(true);
    }
  };

  const handleConfirmEditExperts = async () => {

    // Calcular total expertos actuales que no se eliminarían
    const currentExperts = [
      ...(selectedIssue.participatedExperts || []),
      ...(selectedIssue.acceptedButNotEvaluatedExperts || []),
      ...(selectedIssue.pendingExperts || []),
      ...(selectedIssue.notAcceptedExperts || [])
    ];

    const remainingExperts = currentExperts.filter(email => !expertsToRemove.includes(email));

    // Validar que quede al menos 1 experto
    if (remainingExperts.length + expertsToAdd.length < 1) {
      showSnackbarAlert("An issue must have at least one expert.", "error");
      return; // Salir sin hacer la llamada a editExperts
    }

    setEditExpertsLoading(true);

    const response = await editExperts(selectedIssue.name, expertsToAdd, expertsToRemove);

    if (response.success) {
      const updatedIssue = (() => {
        const removeExpertsFromList = (list) =>
          (list || []).filter(email => !expertsToRemove.includes(email));

        const alreadyInAnyList = new Set([
          ...(selectedIssue.notAcceptedExperts || []),
          ...(selectedIssue.pendingExperts || []),
          ...(selectedIssue.acceptedButNotEvaluatedExperts || []),
          ...(selectedIssue.participatedExperts || []),
        ]);

        const newExpertsToAdd = expertsToAdd.filter(email => !alreadyInAnyList.has(email));

        return {
          ...selectedIssue,
          pendingExperts: [
            ...removeExpertsFromList(selectedIssue.pendingExperts),
            ...newExpertsToAdd, // ← aquí añadimos los nuevos expertos
          ],
          notAcceptedExperts: removeExpertsFromList(selectedIssue.notAcceptedExperts),
          acceptedButNotEvaluatedExperts: removeExpertsFromList(selectedIssue.acceptedButNotEvaluatedExperts),
          participatedExperts: removeExpertsFromList(selectedIssue.participatedExperts),
        };
      })();

      setSelectedIssue(updatedIssue);

      setActiveIssues(prevIssues =>
        prevIssues.map(issue =>
          issue.name === updatedIssue.name ? updatedIssue : issue
        )
      );
    }

    setEditExpertsLoading(false);
    showSnackbarAlert(response.msg, response.success ? "success" : "error");
    // Limpieza de estado
    setIsEditingExperts(false);
    setOpenConfirmEditExpertsDialog(false);
    setExpertsToRemove([]);
    setExpertsToAdd([]);
    setHoveredChip(null);
  };


  const handleCancelEditExperts = () => {
    setOpenConfirmEditExpertsDialog(false);
    setIsEditingExperts(false);
    setExpertsToRemove([])
    setExpertsToAdd([]);
    setHoveredChip(null);
  };

  const handleRateAlternatives = () => {
    setIsRatingAlternatives(true)
  }

  const handleOpenIssueDialog = (issue) => {
    setSelectedIssue(issue);
    setOpenIssueDialog(true);
  };

  const handleCloseIssueDialog = () => {
    setSelectedIssue(null);
    setIsEditingExperts(false)
    setOpenIssueDialog(false);
    handleCancelEditExperts();
  };

  const handleResolveIssue = async () => {
    setResolveLoading(true)
    setOpenResolveConfirmDialog(false)
    
    const response = await resolveIssue(selectedIssue.name, selectedIssue.isPairwise)
    if (response.success) {
      if (response.finished === true) {
        console.log(response.rankedAlternatives)
        setActiveIssues(prevIssues => prevIssues.filter(issue => issue.name !== selectedIssue.name));
        showSnackbarAlert(response.msg, "success");
        fetchFinishedIssues()
      } else {
        showSnackbarAlert(response.msg, "info");
        fetchActiveIssues()
      }
      handleCloseIssueDialog();
    } else {
      showSnackbarAlert(response.msg, "error");
      handleCloseIssueDialog();
      setLoading(false)
    }
    setResolveLoading(false)
  }

  const handleLeaveIssue = async () => {
    console.log("Leaving issue: ", selectedIssue.name);
    setLeaveLoading(true)
    setOpenLeaveConfirmDialog(false)
    const response = await leaveIssue(selectedIssue.name); // true para indicar que es un leave

    if (response.success) {
      setActiveIssues(prevIssues => prevIssues.filter(issue => issue.name !== selectedIssue.name));
      handleCloseIssueDialog();
      showSnackbarAlert(response.msg, "success");
    } else {
      showSnackbarAlert(response.msg, "error");
    }
    setLeaveLoading(false)
  }

  if (loading) {
    // Mostrar un loader mientras los datos se están cargando
    return <CircularLoading color="secondary" size={50} height="30vh" />;
  }

  if (activeIssues?.length === 0) {
    return (
      <>
        <Typography variant="h4" sx={{ mt: 5, textAlign: "center" }}>
          No active issues
        </Typography>
      </>
    );
  }

  console.log(selectedIssue?.isPairwise)

  return (
    <>
      <Backdrop open={resolveLoading} sx={{ zIndex: 999999 }}>
        <CircularLoading color="secondary" size={50} height="50vh" />
      </Backdrop>
      <Stack
        direction="column"
        spacing={2}
        sx={{
          justifyContent: "center",
        }}
      >
        {/* Masonry con las cards */}
        <Masonry columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} spacing={2} sequential>
          {activeIssues?.map((issue, index) => (
            <GlassCard key={index} elevation={0}>
              <CardActionArea onClick={() => handleOpenIssueDialog(issue)}>
                <CardContent>
                  {/* Título del issue */}
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1, color: "text.primary" }}>
                      {issue.name}
                    </Typography>
                    {issue.isAdmin && <AccountCircleIcon />}
                  </Stack>

                  {/* Información resumida */}
                  <Typography
                    variant="body2"
                    sx={{
                      mb: 1.6,
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "normal",
                      color: "text.secondary",
                    }}
                  >
                    {issue.description}
                  </Typography>

                  {/* Estado de evaluación */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <StyledChip
                      label={
                        issue.isAdmin
                          ? issue.isExpert
                            ? !issue.evaluated
                              ? "Pending Evaluation" // admin experto y no ha evaluado
                              : (issue.pendingExperts.length > 0 || issue.acceptedButNotEvaluatedExperts.length > 0)
                                ? "Waiting experts" // admin experto evaluó, pero otros expertos no
                                : "All experts evaluated" // todos evaluaron
                            : (issue.pendingExperts.length > 0 || issue.acceptedButNotEvaluatedExperts.length > 0)
                              ? "Waiting experts" // admin no experto
                              : "All experts evaluated"
                          : issue.evaluated
                            ? "Evaluated"  // usuario normal que ya evaluó
                            : "Pending Evaluation" // usuario normal pendiente
                      }
                      color={
                        issue.isAdmin
                          ? issue.isExpert
                            ? !issue.evaluated
                              ? "error"     // admin experto sin evaluar
                              : (issue.pendingExperts.length > 0 || issue.acceptedButNotEvaluatedExperts.length > 0)
                                ? "info"    // admin experto evaluó, resto pendientes
                                : "success" // todos evaluaron
                            : (issue.pendingExperts.length > 0 || issue.acceptedButNotEvaluatedExperts.length > 0)
                              ? "info"    // admin no experto
                              : "success"
                          : issue.evaluated
                            ? "success"   // usuario normal evaluó
                            : "error"     // usuario normal pendiente
                      }
                      size="small"
                      variant="outlined"
                    />

                  </Box>

                  {/* Fechas */}
                  <Typography variant="caption" display="block" sx={{ color: "text.secondary" }}>
                    Creation: {dayjs(issue.creationDate).format("DD/MM/YYYY")}
                  </Typography>
                  {
                    issue.closureDate &&
                    <Typography variant="caption" display="block" sx={{ color: "text.secondary" }}>
                      Closure: {dayjs(issue.closureDate).format("DD/MM/YYYY")}
                    </Typography>
                  }

                </CardContent>
              </CardActionArea>
            </GlassCard>
          ))}
        </Masonry>

        {/* Modal con los detalles completos */}
        <IssueDialog
          openIssueDialog={openIssueDialog}
          handleCloseIssueDialog={handleCloseIssueDialog}
          selectedIssue={selectedIssue}
          setOpenRemoveConfirmDialog={setOpenRemoveConfirmDialog}
          isEditingExperts={isEditingExperts}
          isRatingAlternatives={isRatingAlternatives}
          handleAddExpert={handleAddExpert}
          handleDeleteExpert={handleDeleteExpert}
          handleEditExperts={handleEditExperts}
          handleRateAlternatives={handleRateAlternatives}
          setOpenResolveConfirmDialog={setOpenResolveConfirmDialog}
          expertsToRemove={expertsToRemove}
          setOpenAddExpertsDialog={setOpenAddExpertsDialog}
          expertsToAdd={expertsToAdd}
          setExpertsToAdd={setExpertsToAdd}
          hoveredChip={hoveredChip}
          setHoveredChip={setHoveredChip}
          openLeaveConfirmDialog={openLeaveConfirmDialog}
          setOpenLeaveConfirmDialog={setOpenLeaveConfirmDialog}
          handleLeaveIssue={handleLeaveIssue}
          leaveLoading={leaveLoading}
        />

      </Stack>

      {selectedIssue?.isPairwise ? (
        <EvaluationPairwiseMatrixDialog
          isRatingAlternatives={isRatingAlternatives}
          setIsRatingAlternatives={setIsRatingAlternatives}
          selectedIssue={selectedIssue}
        />
      ) : (
        <EvaluationMatrixDialog
          isRatingAlternatives={isRatingAlternatives}
          setIsRatingAlternatives={setIsRatingAlternatives}
          selectedIssue={selectedIssue}
        />
      )}


      {/* Diálogo de confirmación de borrar el issue */}
      <Dialog open={openRemoveConfirmDialog} onClose={() => setOpenRemoveConfirmDialog(false)}>
        <DialogTitle>Are you sure you want to remove this issue?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setOpenRemoveConfirmDialog(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleRemoveIssue} color="error" loading={removeLoading} loadingPosition="end">
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmación de resolver problema */}
      <Dialog open={openResolveConfirmDialog} onClose={() => setOpenResolveConfirmDialog(false)}>
        <DialogTitle>Are you sure you want to resolve this issue?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setOpenResolveConfirmDialog(false)} color="error">
            Cancel
          </Button>
          <Button onClick={handleResolveIssue} color="warning">
            Resolve
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openConfirmEditExpertsDialog}
        onClose={handleCancelEditExperts}
      >{/* 
        <DialogTitle>Confirm changes</DialogTitle> */}
        <DialogContent>
          <Stack spacing={3} sx={{ width: "100%" }}>
            {expertsToRemove.length > 0 &&
              <Box>
                <Typography>
                  The following experts will be removed:
                </Typography>
                <Box sx={{ mt: 1 }}>
                  {expertsToRemove.map((expert, idx) => (
                    <Typography key={idx} variant="body2" sx={{ ml: 1 }}>
                      • {expert}
                    </Typography>
                  ))}
                </Box>
              </Box>
            }
            {expertsToAdd.length > 0 &&
              <Box>
                <Typography>
                  The following experts will be added:
                </Typography>
                <Box sx={{ mt: 0.8 }}>
                  {expertsToAdd.map((expert, idx) => (
                    <Typography key={idx} variant="body2" sx={{ ml: 1 }}>
                      • {expert}
                    </Typography>
                  ))}
                </Box>
              </Box>
            }
          </Stack>

        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEditExperts} color="info" size="small">
            Cancel
          </Button>
          <Button onClick={handleConfirmEditExperts} color="warning" loading={editExpertsLoading} loadingPosition="end" size="small">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openAddExpertsDialog}
        onClose={() => setOpenAddExpertsDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ elevation: 0 }}
      >
        <ExpertsStep
          initialExperts={availableExperts}
          addedExperts={expertsToAdd}
          setAddedExperts={setExpertsToAdd}
        />

        <DialogActions>
          <Button onClick={() => setOpenAddExpertsDialog(false)} color="info" variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={() => {
              setOpenAddExpertsDialog(false);
            }}
            variant="outlined"
            color="success"
          >
            Add Selected
          </Button>
        </DialogActions>
      </Dialog>


    </>
  );
};

export default ActiveIssuesPage;

