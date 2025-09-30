import { useEffect, useState } from "react";
import { Stack, Typography, CardContent, CardActionArea, Dialog, DialogTitle, DialogActions, Button, Box, Backdrop, DialogContent, LinearProgress } from "@mui/material";
import Masonry from "@mui/lab/Masonry";
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useIssuesDataContext } from "../../src/context/issues/issues.context";
import { CircularLoading } from "../../src/components/LoadingProgress/CircularLoading";
import { editExperts, leaveIssue, removeIssue, resolveIssue } from "../../src/controllers/issueController";
import { IssueDialog } from "../../src/components/IssueDialog/IssueDialog";
import { EvaluationPairwiseMatrixDialog } from "../../src/components/EvaluationPairwiseMatrixDialog/EvaluationPairwiseMatrixDialog";
import { useSnackbarAlertContext } from "../../src/context/snackbarAlert/snackbarAlert.context";
import { ExpertsStep } from "../createIssue/Steps/ExpertsStep/ExpertsStep";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { EvaluationMatrixDialog } from "../../src/components/EvaluationMatrixDialog/EvaluationMatrixDialog";
import { GlassCard } from "../../src/components/StyledComponents/GlassCard";
import { StyledChip } from "../../src/components/StyledComponents/StyledChip";
import { GlassDialog } from "../../src/components/StyledComponents/GlassDialog";

dayjs.extend(utc);
dayjs.extend(timezone);

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

  console.log(selectedIssue)

  return (
    <>
      <Backdrop open={resolveLoading} sx={{ zIndex: 999999 }}>
        <CircularLoading color="secondary" size={50} height="50vh" />
      </Backdrop>
      <Stack
        direction="column"
        spacing={2}
        sx={{
          alignItems: "center",
        }}
      >
        {/* Masonry con las cards */}
        <Masonry columns={{ xs: 1, md: 2, lg: 3, xl: 3 }} spacing={2} sequential sx={{ maxWidth: 2200, alignItems: "center" }}>
          {activeIssues?.map((issue, index) => (
            <GlassCard key={index} elevation={0}>
              <CardActionArea onClick={() => handleOpenIssueDialog(issue)}>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction={"row"} alignItems={"stretch"} justifyContent={"space-between"}>
                      {/* Nombre */}
                      <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                        {issue.name}
                      </Typography>
                      {issue.isAdmin && <AccountCircleIcon />}
                    </Stack>
                    <Stack alignItems={"space-between"}>
                      <Stack direction="row" spacing={2} justifyContent={"space-between"} >
                        {/* Columna izquierda */}
                        <Stack direction={"column"} flexWrap={"wrap"}>
                          {/* Descripción */}
                          <Typography
                            variant="body1"
                            sx={{
                              mb: 1,
                              display: "-webkit-box",
                              WebkitBoxOrient: "vertical",
                              WebkitLineClamp: 2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "normal",
                            }}
                          >
                            {issue.description}
                          </Typography>
                          {/* Info extra */}
                          <Stack spacing={0.5} sx={{ color: "text.secondary" }}>
                            <Typography variant="body2">
                              <strong>Model:</strong> {issue.model}
                            </Typography>
                            {
                              issue.isConsensus &&
                              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                <strong>Type:</strong> Consensus
                              </Typography>
                            }
                            <Typography variant="body2">
                              <strong>Alternatives:</strong> {issue.alternatives.join(", ")}
                            </Typography>
                            {/* <Typography variant="body2" color="text.secondary">
                            <strong>Closure date: </strong>
                            {issue.closureDate
                              ? dayjs(issue.closureDate).diff(dayjs(), "days") > 0
                                ? `${dayjs(issue.closureDate).diff(dayjs(), "days")} days left`
                                : issue.closureDate
                              : "No deadline"}
                          </Typography> */}
                          {!issue.closureDate &&<Typography variant="body2" color="text.secondary" fontWeight={"bold"}>No deadline</Typography>}
                            
                            {/* Estado */}
                            <Box sx={{ pt: 1 }}>
                              <StyledChip
                                label={
                                  issue.isExpert
                                    ? !issue.evaluated
                                      ? "Pending Evaluation"
                                      : (issue.pendingExperts.length > 0 || issue.acceptedButNotEvaluatedExperts.length > 0)
                                        ? "Waiting experts"
                                        : "All experts evaluated"
                                    : issue.evaluated
                                      ? "Evaluated"
                                      : "Pending Evaluation"
                                }
                                color={
                                  issue.isExpert
                                    ? !issue.evaluated
                                      ? "error"
                                      : (issue.pendingExperts.length > 0 || issue.acceptedButNotEvaluatedExperts.length > 0)
                                        ? "info"
                                        : "success"
                                    : issue.evaluated
                                      ? "success"
                                      : "error"
                                }
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          </Stack>
                        </Stack>
                        {/* Columna derecha: gráfico */}
                        <Stack>
                          <ExpertParticipationChart
                            total={issue.totalExperts}
                            pending={issue.pendingExperts.length}
                            accepted={issue.participatedExperts.length}
                            notEvaluated={issue.acceptedButNotEvaluatedExperts.length}
                          />
                        </Stack>
                      </Stack>
                      {
                        issue.closureDate &&
                        <IssueTimeline creationDate={issue.creationDate} closureDate={issue.closureDate} />
                      }
                    </Stack>

                  </Stack>

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

      <GlassDialog
        open={openAddExpertsDialog}
        onClose={() => setOpenAddExpertsDialog(false)}
        PaperProps={{ elevation: 0 }}
        maxWidth="auto"
      >
        <ExpertsStep
          initialExperts={availableExperts}
          addedExperts={expertsToAdd}
          setAddedExperts={setExpertsToAdd}
          closeAddExpertsDialog={{ closeAddExpertsDialog: () => setOpenAddExpertsDialog(false) }}
        />
      </GlassDialog>


    </>
  );
};

export default ActiveIssuesPage;

import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";

ChartJS.register(ArcElement, Tooltip);

const ExpertParticipationChart = ({ total, pending, accepted, notEvaluated }) => {
  const evaluated = accepted;
  const percent = total > 0 ? Math.round((evaluated / total) * 100) : 0;

  const data = {
    labels: ["Evaluated", "Not Evaluated", "Pending"],
    datasets: [
      {
        data: [evaluated, notEvaluated, pending],
        backgroundColor: [
          "rgba(76, 175, 80, 0.8)",   // success (verde)
          "rgba(255, 193, 7, 0.8)",   // warning (amarillo)
          "rgba(244, 67, 54, 0.8)",   // error (rojo)
        ],
        borderWidth: 0, // sin borde grueso
        cutout: "80%",  // donut fino
        spacing: 1, // espacio entre segmentos
      },
    ],
  };

  const options = {
    plugins: { tooltip: { enabled: false }, legend: { display: false } },
    maintainAspectRatio: false,
  };

  return (
    <Box sx={{ position: "relative", width: 120, height: 120 }}>
      <Doughnut data={data} options={options} />
      {/* Texto central */}
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}
      >
        <Typography variant="h6" fontWeight={"bold"}>
          {percent} %
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {pending + notEvaluated + evaluated} experts
        </Typography>
      </Box>
    </Box>
  );
};


import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const IssueTimeline = ({ creationDate, closureDate }) => {
  const creation = dayjs(creationDate, "DD-MM-YYYY");
  const today = dayjs();
  const closure = closureDate ? dayjs(closureDate, "DD-MM-YYYY") : null;

  let progress = 0;
  let totalDays = 0;
  let elapsedDays = 0;

  if (closure) {
    totalDays = closure.diff(creation, "days");
    elapsedDays = today.diff(creation, "days");
    progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
  }

  return (
    <Box sx={{ width: "100%", mt: 1 }}>
      {/* Fechas */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {creation.format("DD MMM")}
        </Typography>
        {closure && (
          <Typography variant="caption" color="text.secondary">
            {closure.format("DD MMM")}
          </Typography>
        )}
      </Box>

      {/* Barra */}
      {closure ? (
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 8,
            borderRadius: 5,
            backgroundColor: "rgba(200,200,200,0.2)",
            "& .MuiLinearProgress-bar": {
              backgroundColor:
                progress >= 100 ? "#f44336" : "#2196f3",
            },
          }}
        />
      ) : (
        <Typography variant="caption" color="text.secondary">
          No deadline
        </Typography>
      )}

      {/* Texto */}
      {closure && (
        <Box sx={{ textAlign: "center", mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {progress >= 100
              ? "Closed"
              : `${Math.max(0, closure.diff(today, "days"))} days left`}
          </Typography>
        </Box>
      )}
    </Box>
  );
};