import { useEffect, useState } from "react";
import { Stack, Typography, CardContent, CardActionArea, Dialog, DialogTitle, DialogActions, Button, Box, Backdrop, DialogContent } from "@mui/material";
import Masonry from "@mui/lab/Masonry";
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useIssuesDataContext } from "../../src/context/issues/issues.context";
import { CircularLoading } from "../../src/components/LoadingProgress/CircularLoading";
import { computeManualWeights, computeWeights, editExperts, leaveIssue, removeIssue, resolveIssue } from "../../src/controllers/issueController";
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
import { IssueTimeline } from "../../src/components/IssueTimeline/IssueTimeline";
import { ExpertParticipationChart } from "../../src/components/ExpertParticipationChart/ExpertParticipationChart";
import AddExpertsDomainsDialog from "../../src/components/AddExpertsDomainsDialog/AddExpertsDomainsDialog";
import { RateBwmWeightsDialog } from "../../src/components/RateBwmWeightsDialog/RateBwmWeightsDialog";
import { RateConsensusWeightsDialog } from "../../src/components/RateConsensusWeightsDialog/RateConsensusWeightsDialog";

dayjs.extend(utc);
dayjs.extend(timezone);

const ActiveIssuesPage = () => {

  const { showSnackbarAlert } = useSnackbarAlertContext()

  const [selectedIssue, setSelectedIssue] = useState(null);
  const [openIssueDialog, setOpenIssueDialog] = useState(false);
  const [openRemoveConfirmDialog, setOpenRemoveConfirmDialog] = useState(false);
  const [isEditingExperts, setIsEditingExperts] = useState(false);
  const [isRatingAlternatives, setIsRatingAlternatives] = useState(false)
  const [isRatingWeights, setIsRatingWeights] = useState(false)
  const [openResolveConfirmDialog, setOpenResolveConfirmDialog] = useState(false);
  const [resolveLoading, setResolveLoading] = useState(false);

  const [openComputeWeightsConfirmDialog, setOpenComputeWeightsConfirmDialog] = useState(false);
  const [computeWeightsLoading, setComputeWeightsLoading] = useState(false);

  const [removeLoading, setRemoveLoading] = useState(false);
  const [expertsToRemove, setExpertsToRemove] = useState([]);
  const [openConfirmEditExpertsDialog, setOpenConfirmEditExpertsDialog] = useState(false);
  const [openAddExpertsDialog, setOpenAddExpertsDialog] = useState(false);
  const [expertsToAdd, setExpertsToAdd] = useState([]); // lista provisional de emails
  const [hoveredChip, setHoveredChip] = useState(null);
  const [editExpertsLoading, setEditExpertsLoading] = useState(false);
  const [openLeaveConfirmDialog, setOpenLeaveConfirmDialog] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [openAssignDomainsDialog, setOpenAssignDomainsDialog] = useState(false);
  const [, setNewDomainAssignments] = useState(null);

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
    const currentExperts = [
      ...(selectedIssue.participatedExperts || []),
      ...(selectedIssue.acceptedButNotEvaluatedExperts || []),
      ...(selectedIssue.pendingExperts || []),
      ...(selectedIssue.notAcceptedExperts || [])
    ];

    const remainingExperts = currentExperts.filter(email => !expertsToRemove.includes(email));

    if (remainingExperts.length + expertsToAdd.length < 1) {
      showSnackbarAlert("An issue must have at least one expert.", "error");
      return;
    }

    // Si hay nuevos expertos, primero pedimos dominios
    if (expertsToAdd.length > 0) {
      setOpenConfirmEditExpertsDialog(false);
      setOpenAssignDomainsDialog(true);
      return;
    }

    // Si no hay nuevos expertos, seguir con la lógica original
    await processEditExperts();
  };

  const processEditExperts = async (domainAssignments = null) => {
    setEditExpertsLoading(true);

    const response = await editExperts(selectedIssue.name, expertsToAdd, expertsToRemove, domainAssignments);

    if (response.success) {
      await fetchActiveIssues(); // 🔥 actualiza lista completa
    }

    setEditExpertsLoading(false);
    showSnackbarAlert(response.msg, response.success ? "success" : "error");
    setIsEditingExperts(false);
    setOpenConfirmEditExpertsDialog(false);
    setExpertsToRemove([]);
    setExpertsToAdd([]);
    setHoveredChip(null);
  };

  const handleConfirmDomains = async (domainAssignments) => {
    setNewDomainAssignments(domainAssignments);
    setOpenAssignDomainsDialog(false);
    await processEditExperts(domainAssignments);
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

  const handleRateWeights = () => {
    setIsRatingWeights(true)
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
        await fetchFinishedIssues()
      } else {
        showSnackbarAlert(response.msg, "info");
        await fetchActiveIssues()
      }
      handleCloseIssueDialog();
    } else {
      showSnackbarAlert(response.msg, "error");
      handleCloseIssueDialog();
      setLoading(false)
    }
    setResolveLoading(false)
  }

  const handleComputeWeightsIssue = async () => {
    setComputeWeightsLoading(true);
    setOpenComputeWeightsConfirmDialog(false);

    let response;

    // 👉 Si el modo de ponderación es consenso manual → usar computeManualWeights
    if (selectedIssue.weightingMode === "consensus") {
      response = await computeManualWeights(selectedIssue.name);
    }
    // 👉 En caso contrario (BWM normal o simulated) → usar computeWeights
    else {
      response = await computeWeights(selectedIssue.name);
    }

    if (response.success) {
      if (response.finished === true) {
        showSnackbarAlert(response.msg, "success");
      } else {
        showSnackbarAlert(response.msg, "info");
      }
      await fetchActiveIssues();
      await fetchFinishedIssues();
      handleCloseIssueDialog();
    } else {
      showSnackbarAlert(response.msg, "error");
      handleCloseIssueDialog();
      setLoading(false);
    }

    setComputeWeightsLoading(false);
  };


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
      <Backdrop open={resolveLoading || computeWeightsLoading} sx={{ zIndex: 999999 }}>
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
                              <strong>Model:</strong> {issue.model.name}
                            </Typography>

                            {issue.isConsensus && (
                              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                <strong>Type:</strong> Consensus
                              </Typography>
                            )}

                            <Typography variant="body2">
                              <strong>Alternatives:</strong> {issue.alternatives.join(", ")}
                            </Typography>

                            {!issue.closureDate && (
                              <Typography variant="body2" color="text.secondary" fontWeight={"bold"}>
                                No deadline
                              </Typography>
                            )}

                            <Box sx={{ pt: 1 }}>
                              {/* ✅ NUEVO CHIP (reemplaza toda la lógica anterior) */}
                              <StyledChip
                                label={
                                  issue.statusFlags.waitingAdmin
                                    ? (
                                      issue.currentStage === "weightsFinished"
                                        ? "Waiting for admin to compute weights"
                                        : "Waiting for admin to resolve issue"
                                    )
                                    : issue.currentStage === "finished"
                                      ? "Finished"
                                      : issue.statusFlags.canEvaluateWeights
                                        ? "Evaluate Criteria Weights"
                                        : issue.statusFlags.canComputeWeights
                                          ? "Ready to Compute Weights"
                                          : issue.statusFlags.canEvaluateAlternatives
                                            ? "Evaluate Alternatives"
                                            : issue.statusFlags.canResolveIssue
                                              ? "Ready to Resolve"
                                              : "Waiting experts"
                                }
                                color={
                                  issue.statusFlags.waitingAdmin
                                    ? "warning"
                                    : issue.currentStage === "finished"
                                      ? "success"
                                      : issue.statusFlags.canComputeWeights || issue.statusFlags.canResolveIssue
                                        ? "warning"
                                        : issue.statusFlags.canEvaluateWeights || issue.statusFlags.canEvaluateAlternatives
                                          ? "error"
                                          : "info"
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
          handleRateWeights={handleRateWeights}
          setOpenResolveConfirmDialog={setOpenResolveConfirmDialog}
          setOpenComputeWeightsConfirmDialog={setOpenComputeWeightsConfirmDialog}
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
          setOpenIssueDialog={setOpenIssueDialog}
          isRatingAlternatives={isRatingAlternatives}
          setIsRatingAlternatives={setIsRatingAlternatives}
          selectedIssue={selectedIssue}
        />
      ) : (
        <EvaluationMatrixDialog
          setOpenIssueDialog={setOpenIssueDialog}
          isRatingAlternatives={isRatingAlternatives}
          setIsRatingAlternatives={setIsRatingAlternatives}
          selectedIssue={selectedIssue}
        />
      )}

      {selectedIssue?.weightingMode === "consensus" ? (
        <RateConsensusWeightsDialog
          isRatingWeights={isRatingWeights}
          setIsRatingWeights={setIsRatingWeights}
          selectedIssue={selectedIssue}
          handleCloseIssueDialog={handleCloseIssueDialog}
        />
      ) : (
        <RateBwmWeightsDialog
          isRatingWeights={isRatingWeights}
          setIsRatingWeights={setIsRatingWeights}
          selectedIssue={selectedIssue}
          handleCloseIssueDialog={handleCloseIssueDialog}
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

      {/* Diálogo de confirmación de calcular pesos */}
      <Dialog open={openComputeWeightsConfirmDialog} onClose={() => setOpenComputeWeightsConfirmDialog(false)}>
        <DialogTitle>Are you sure you want to compute weights?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setOpenComputeWeightsConfirmDialog(false)} color="error">
            Cancel
          </Button>
          <Button onClick={handleComputeWeightsIssue} color="warning">
            Compute weights
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

      <AddExpertsDomainsDialog
        open={openAssignDomainsDialog}
        onClose={() => setOpenAssignDomainsDialog(false)}
        issue={selectedIssue}
        expertsToAdd={expertsToAdd}
        onConfirmDomains={handleConfirmDomains}
      />



    </>
  );
};

export default ActiveIssuesPage;