
import { Stack, Dialog, DialogTitle, DialogContent, DialogActions, Divider, IconButton, Paper, Typography, Tabs, Tab, MobileStepper, Button, List, ListItemButton, Collapse, ListItem, Chip, Backdrop, ImageList, ImageListItem, FormControl, InputLabel, Select, MenuItem, ToggleButton, useMediaQuery } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import { styled, useTheme } from '@mui/material/styles';
import { useEffect, useState } from "react";
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { getFinishedIssueInfo } from "../../controllers/issueController";
import { CircularLoading } from "../LoadingProgress/CircularLoading";
import { MatrixAltPair } from "../MatrixAltPair/MatrixAltPair";
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';


const CustomPaper = styled(Paper)(({ theme }) => ({
  width: "100%",
  height: "auto",
  minHeight: 200,
  padding: theme.spacing(2),
  ...theme.typography.body2,
  textAlign: 'center',
  borderRadius: "10px",
}));

export const FinishedIssueDialog = ({ selectedIssue, openFinishedIssueDialog, handleCloseFinishedIssueDialog, setOpenRemoveConfirmDialog }) => {

  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up('md'));

  const cols = isMd ? 4 : 2;

  const [currentPhaseIndex, setcurrentPhaseIndex] = useState(0);
  const [openDescriptionList, setOpenDescriptionList] = useState(false);
  const [openCriteriaList, setOpenCriteriaList] = useState(false);
  const [openAlternativeList, setOpenAlternativesList] = useState(false)
  const [openConsensusInfoList, setOpenConsensusInfoList] = useState(false)
  const [openExpertsList, setOpenExpertsList] = useState(false)
  const [openParticipatedExpertsList, setOpenParticipatedExpertsList] = useState(false)
  const [openNotAcceptedExpertsList, setOpenNotAcceptedExpertsList] = useState(false)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [issue, setIssue] = useState({})
  const [activeStep, setActiveStep] = useState(0);
  const [showCollective, setShowCollective] = useState(false);


  const initialExpert = Object.keys(issue.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations || {})[0] || "";
  const initialCriterion = Object.keys(issue.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations?.[initialExpert] || {})[0] || "";

  const [selectedExpert, setSelectedExpert] = useState(initialExpert);
  const [selectedCriterion, setSelectedCriterion] = useState(initialCriterion);

  const expertList = Object.keys(issue.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations || {});
  const criterionList = Object.keys(issue.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations?.[selectedExpert] || {});

  const evaluations = issue?.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations?.[selectedExpert]?.[selectedCriterion] || [];

  const collectiveEvaluations = showCollective ? issue?.expertsRatings?.[currentPhaseIndex + 1]?.collectiveEvaluations?.[selectedCriterion] || [] : [];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleChangeCriterion = (index) => setcurrentPhaseIndex(index)

  useEffect(() => {
    const fetchIssue = async () => {
      setLoadingInfo(true);
      const response = await getFinishedIssueInfo(selectedIssue?.name);
      const loadedIssue = response.issueInfo;

      // Obtener todas las fases (como enteros)
      const phaseKeys = Object.keys(loadedIssue.expertsRatings || {})
        .map((key) => parseInt(key))
        .filter((key) => !isNaN(key));

      // Obtener la última fase (máximo)
      const lastConsensusPhaseIndex = Math.max(...phaseKeys, 0) - 1; // porque usas +1 luego

      setIssue(loadedIssue);
      setcurrentPhaseIndex(lastConsensusPhaseIndex); // lo seteamos aquí
      setLoadingInfo(false);

      console.log("Issue loaded:", loadedIssue);
    };

    fetchIssue();
  }, [selectedIssue]);

  useEffect(() => {
    const newExpert = Object.keys(issue.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations || {})[0] || "";
    const newCriterion = Object.keys(issue.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations?.[newExpert] || {})[0] || "";
    setSelectedExpert(newExpert);
    setSelectedCriterion(newCriterion);
  }, [issue, currentPhaseIndex]);

  const scatterPlotRef = useRef(null);  // Referencia para el gráfico
  const consensusLevelChartRef = useRef(null);  // Referencia para el gráfico

  // Función para resetear el zoom
  const resetZoom = (chart) => {
    if (chart.current) {
      chart.current.resetZoom();  // Cambio aquí: acceder directamente al método de reset
    }
  }



  return (
    <>
      <Dialog open={openFinishedIssueDialog} onClose={handleCloseFinishedIssueDialog} fullScreen PaperProps={{ elevation: 0, sx: { bgcolor: "#1D1D1B" } }} >
        <Stack direction={"row"} sx={{ justifyContent: "space-between", alignItems: "center" }} useFlexGap>
          <DialogTitle variant="h5" sx={{ fontWeight: "bold", color: "text.primary" }}>
            {selectedIssue.name}
          </DialogTitle>
          <DialogActions>
            <IconButton onClick={() => setOpenRemoveConfirmDialog(true)} color="error" variant="outlined" sx={{ mr: 0.5 }}>
              <DeleteOutlineIcon />
            </IconButton>
            <IconButton onClick={handleCloseFinishedIssueDialog} color="inherit" variant="outlined" sx={{ mr: 0.5 }}>
              <CloseIcon />
            </IconButton>
          </DialogActions>
        </Stack>
        <Divider />
        {
          loadingInfo || !issue.summary ? (
            <Backdrop open={loadingInfo} sx={{ zIndex: 999999 }}>
              <CircularLoading color="secondary" size={50} height="50vh" />
            </Backdrop>
          ) : (
            <DialogContent sx={{ p: 1, pb: 2 }}>
              <Stack spacing={2} alignItems="center" sx={{ width: "100%" }}>
                {issue.summary.consensusInfo.consensusReachedPhase > 1 && (
                  <Tabs
                    value={currentPhaseIndex}
                    onChange={(event, newIndex) => handleChangeCriterion(newIndex)}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    sx={{ width: "100%", pl: 2 }}
                    indicatorColor="secondary"
                    textColor="contrastText"
                  >
                    {/* Aquí generamos las pestañas dinámicamente basadas en el número de fases */}
                    {Array.from({ length: issue.summary.consensusInfo.consensusReachedPhase }).map((_, index) => (
                      <Tab
                        key={index}
                        label={`Round ${index + 1}`}  // Muestra la fase como "Phase 1", "Phase 2", etc.
                        sx={{ width: "auto", px: 5 }}
                      />
                    ))}
                  </Tabs>
                )}

                <ImageList
                  sx={{ width: "100%" }}
                  variant="quilted"
                  cols={cols}
                  rowHeight={"auto"}
                >
                  <ImageListItem cols={2} sx={{ p: 1 }}>
                    <Stack direction={{ xs: "column", xl: "row" }} spacing={2}>
                      <CustomPaper elevation={0}>
                        <Stack spacing={2}>
                          <Typography variant="h5">Summary</Typography>
                          <Stack>
                            <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                              <ListItem>
                                <Stack direction="row" spacing={1}>
                                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                                    Name:
                                  </Typography>
                                  <Typography variant="body1" sx={{ color: "text.primary" }}>
                                    {issue.summary.name}
                                  </Typography>
                                </Stack>
                              </ListItem>
                              <ListItem>
                                <Stack direction="row" spacing={1}>
                                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                                    Admin:
                                  </Typography>
                                  <Typography variant="body1" sx={{ color: "text.primary" }}>
                                    {issue.summary.admin}
                                  </Typography>
                                </Stack>
                              </ListItem>
                              <ListItemButton onClick={() => setOpenDescriptionList(!openDescriptionList)}>
                                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                                  Description
                                </Typography>
                                {openDescriptionList ? <ExpandLess /> : <ExpandMore />}
                              </ListItemButton>
                              <Collapse in={openDescriptionList} timeout="auto" unmountOnExit>
                                <List disablePadding>
                                  <ListItem sx={{ ml: 1 }}>
                                    <Typography variant="body1" sx={{ color: "text.primary" }}>
                                      {issue.summary.description}
                                    </Typography>
                                  </ListItem>
                                </List>
                              </Collapse>
                              <ListItem>
                                <Stack direction="row" spacing={1}>
                                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                                    Model:
                                  </Typography>
                                  <Typography variant="body1" sx={{ color: "text.primary" }}>
                                    {issue.summary.model}
                                  </Typography>
                                </Stack>
                              </ListItem>
                              <ListItemButton onClick={() => setOpenCriteriaList(!openCriteriaList)}>
                                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                                  Criteria
                                </Typography>
                                {openCriteriaList ? <ExpandLess /> : <ExpandMore />}
                              </ListItemButton>
                              <Collapse in={openCriteriaList} timeout="auto" unmountOnExit>
                                <List disablePadding>
                                  <ListItem sx={{ ml: 2 }}>
                                    {issue.summary.criteria.map((criterion) => (
                                      <>
                                        <Stack direction={"row"} spacing={2}>
                                          <Typography variant="body1" sx={{ color: "text.primary" }}>
                                            {criterion.name}
                                          </Typography>
                                          <Chip
                                            variant="outlined"
                                            label={criterion.type === "cost" ? "Cost" : "Benefit"}
                                            color={criterion.type === "cost" ? "error" : "success"}
                                            size="small"
                                          />
                                        </Stack>

                                      </>
                                    ))}
                                  </ListItem>
                                </List>
                              </Collapse>
                              <ListItemButton onClick={() => setOpenAlternativesList(!openAlternativeList)}>
                                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                                  Alternatives
                                </Typography>
                                {openAlternativeList ? <ExpandLess /> : <ExpandMore />}
                              </ListItemButton>
                              <Collapse in={openAlternativeList} timeout="auto" unmountOnExit>
                                <List disablePadding>
                                  {issue.summary.alternatives.map((alternative, index) => (
                                    <ListItem key={index} sx={{ ml: 2 }}>
                                      <Typography variant="body1" sx={{ color: "text.primary" }}>
                                        {alternative}
                                      </Typography>
                                    </ListItem>
                                  ))}
                                </List>
                              </Collapse>
                              {issue.summary.experts.notAccepted.length === 0 ?
                                (
                                  <>
                                    <ListItemButton onClick={() => setOpenParticipatedExpertsList(!openParticipatedExpertsList)}>
                                      <Stack direction="row" spacing={1} pr={1}>
                                        <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                                          Experts:
                                        </Typography>
                                        <Typography variant="body1" sx={{ color: "text.primary" }}>
                                          {issue.summary.experts.participated.length}
                                        </Typography>
                                      </Stack>
                                      {openParticipatedExpertsList ? <ExpandLess /> : <ExpandMore />}
                                    </ListItemButton>
                                    <Collapse in={openParticipatedExpertsList} timeout="auto" unmountOnExit>
                                      <List disablePadding>
                                        <ListItem sx={{ ml: 2 }}>
                                          <Stack spacing={0.5}>
                                            {issue.summary.experts.participated.map((expert, index) => (
                                              <>
                                                <Typography key={index} variant="body1" sx={{ color: "text.primary" }}>
                                                  {expert}
                                                </Typography>
                                                {issue.summary.experts.participated.length - 1 !== index && <Divider />}
                                              </>
                                            ))}
                                          </Stack>
                                        </ListItem>
                                      </List>
                                    </Collapse>
                                  </>
                                ) : (
                                  <>
                                    <ListItemButton onClick={() => setOpenExpertsList(!openExpertsList)}>
                                      <Stack direction="row" spacing={1} pr={1}>
                                        <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                                          Experts:
                                        </Typography>
                                        <Typography variant="body1" sx={{ color: "text.primary" }}>
                                          {issue.summary.experts.participated.length + issue.summary.experts.notAccepted.length}
                                        </Typography>
                                      </Stack>
                                      {openExpertsList ? <ExpandLess /> : <ExpandMore />}
                                    </ListItemButton>
                                    <Collapse in={openExpertsList} timeout="auto" unmountOnExit>
                                      <List disablePadding>
                                        <ListItemButton onClick={() => setOpenParticipatedExpertsList(!openParticipatedExpertsList)} sx={{ ml: 2 }}>
                                          <Stack direction="row" spacing={1} pr={1}>
                                            <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                                              Participated
                                            </Typography>
                                            <Typography variant="body1" sx={{ color: "text.primary" }}>
                                              {issue.summary.experts.participated.length}
                                            </Typography>
                                          </Stack>
                                          {openParticipatedExpertsList ? <ExpandLess /> : <ExpandMore />}
                                        </ListItemButton>
                                        <Collapse in={openParticipatedExpertsList} timeout="auto" unmountOnExit>
                                          <List disablePadding>
                                            <ListItem sx={{ ml: 4 }}>
                                              <Stack spacing={0.5}>
                                                {issue.summary.experts.participated.map((expert, index) => (
                                                  <>
                                                    <Typography key={index} variant="body1" sx={{ color: "text.primary" }}>
                                                      {expert}
                                                    </Typography>
                                                    {issue.summary.experts.participated.length - 1 !== index && <Divider />}
                                                  </>
                                                ))}
                                              </Stack>
                                            </ListItem>
                                          </List>
                                        </Collapse>
                                      </List>
                                    </Collapse>
                                    <Collapse in={openExpertsList} timeout="auto" unmountOnExit>
                                      <List disablePadding>
                                        <ListItemButton onClick={() => setOpenNotAcceptedExpertsList(!openNotAcceptedExpertsList)} sx={{ ml: 2 }}>
                                          <Stack direction="row" spacing={1} pr={1}>
                                            <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                                              Not accepted
                                            </Typography>
                                            <Typography variant="body1" sx={{ color: "text.primary" }}>
                                              {issue.summary.experts.notAccepted.length}
                                            </Typography>
                                          </Stack>
                                          {openNotAcceptedExpertsList ? <ExpandLess /> : <ExpandMore />}
                                        </ListItemButton>
                                        <Collapse in={openNotAcceptedExpertsList} timeout="auto" unmountOnExit>
                                          <List disablePadding>
                                            <ListItem sx={{ ml: 4 }}>
                                              <Stack spacing={0.5}>
                                                {issue.summary.experts.notAccepted.map((expert, index) => (
                                                  <>
                                                    <Typography key={index} variant="body1" sx={{ color: "text.primary" }}>
                                                      {expert}
                                                    </Typography>
                                                    {issue.summary.experts.notAccepted.length - 1 !== index && <Divider />}
                                                  </>
                                                ))}
                                              </Stack>
                                            </ListItem>
                                          </List>
                                        </Collapse>
                                      </List>
                                    </Collapse>
                                  </>
                                )}
                              <ListItem>
                                <Stack direction="row" spacing={1}>
                                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                                    Creation date:
                                  </Typography>
                                  <Typography variant="body1" sx={{ color: "text.primary" }}>
                                    {issue.summary.creationDate}
                                  </Typography>
                                </Stack>
                              </ListItem>
                              <ListItem>
                                <Stack direction="row" spacing={1}>
                                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                                    Closure date:
                                  </Typography>
                                  <Typography variant="body1" sx={{ color: "text.primary" }}>
                                    {issue.summary.closureDate}
                                  </Typography>
                                </Stack>
                              </ListItem>
                              {issue.summary.consensusInfo && (
                                <>
                                  <ListItemButton onClick={() => setOpenConsensusInfoList(!openConsensusInfoList)}>
                                    <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                                      Consensus info
                                    </Typography>
                                    {openConsensusInfoList ? <ExpandLess /> : <ExpandMore />}
                                  </ListItemButton>
                                  <Collapse in={openConsensusInfoList} timeout="auto" unmountOnExit>
                                    <List disablePadding>
                                      <ListItem sx={{ ml: 2 }}>
                                        <Stack direction="row" spacing={1}>
                                          <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                                            Maximum rounds:
                                          </Typography>
                                          <Typography variant="body1" sx={{ color: "text.primary" }}>
                                            {issue.summary.consensusInfo.maximumPhases || "Unlimited"}
                                          </Typography>
                                        </Stack>
                                      </ListItem>
                                      <ListItem sx={{ ml: 2 }}>
                                        <Stack direction="row" spacing={1}>
                                          <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                                            Threshold:
                                          </Typography>
                                          <Typography variant="body1" sx={{ color: "text.primary" }}>
                                            {issue.summary.consensusInfo.threshold}
                                          </Typography>
                                        </Stack>
                                      </ListItem>
                                    </List>
                                  </Collapse>
                                </>
                              )}
                            </List>
                          </Stack>
                        </Stack>
                      </CustomPaper>
                      <CustomPaper elevation={0}>
                        <Stack spacing={2}>
                          <Typography variant="h5">Results ranking</Typography>
                          <Stack>
                            <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                              {issue.alternativesRankings[currentPhaseIndex].ranking.map((alternative, index) => (
                                <ListItem key={alternative}>
                                  <Stack direction="row" spacing={1}>
                                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                                      {index + 1}. {/* Aquí mostramos la posición (1, 2, 3...) */}
                                    </Typography>
                                    <Typography variant="h6" sx={{ color: "text.primary" }}>
                                      {alternative} {/* Aquí mostramos el nombre de la alternativa */}
                                    </Typography>
                                  </Stack>
                                </ListItem>
                              ))}
                            </List>

                          </Stack>
                        </Stack>
                      </CustomPaper>
                    </Stack>
                  </ImageListItem>

                  <ImageListItem cols={2} sx={{ p: 1 }}>
                    <CustomPaper elevation={0} sx={{ height: "100%" }}>
                      <Stack spacing={2}>
                        <Typography variant="h5">Consensus</Typography>
                      </Stack>
                    </CustomPaper>
                  </ImageListItem>

                  <ImageListItem cols={isMd ? 4 : 2} rows={2} sx={{ p: 1 }}>
                    <CustomPaper elevation={0}>
                      <Stack
                        spacing={3}
                        alignItems="center"
                        justifyContent="space-between" // <-- esto reparte el espacio
                        height="100%" // <-- asegura que ocupa todo el alto del Paper
                        width="100%" // opcional, por si necesitas que ocupe todo el ancho también
                      >
                        <Typography variant="h5">Analytical graphs</Typography>
                        <Stack width={"100%"} justifyContent={"center"} alignItems={"center"} spacing={2}>
                          <Stack width={"100%"} justifyContent={"center"} alignItems={"center"}>
                            {activeStep === 0 &&
                              <>
                                <Stack width={"100%"} justifyContent={"center"} alignItems={"center"} spacing={2}>
                                  <Stack direction={"row"} width={"100%"} justifyContent={"center"} alignItems={"center"} spacing={2}>
                                    <Typography variant="h6">Scatter plot</Typography>
                                    <Divider flexItem orientation="vertical" />
                                    <Button variant="outlined" color="secondary" onClick={() => resetZoom(scatterPlotRef)} size="small">
                                      Reset
                                    </Button>
                                  </Stack>
                                  <Stack width={{ xs: "100%", md: "90%" }} justifyContent={"center"} alignItems={"center"} height={{ xs: 290, md: 500 }} >
                                    <AnalyticalScatterChart data={issue.analyticalGraphs.scatterPlot} phase={currentPhaseIndex} scatterPlotRef={scatterPlotRef} />
                                  </Stack>
                                </Stack>
                              </>
                            }
                            {activeStep === 1 &&
                              <>
                                <Stack width={"100%"} justifyContent={"center"} alignItems={"center"} spacing={2}>
                                  <Typography variant="h6">Consensus level chart</Typography>
                                  <Stack width={{ xs: "100%", md: "90%" }} justifyContent={"center"} alignItems={"center"} height={{ xs: 290, md: 500 }} >
                                    <AnalyticalConsensusLineChart data={issue.analyticalGraphs.consensusLevelLineChart} consensusLevelChartRef={consensusLevelChartRef} />
                                  </Stack>
                                </Stack>
                              </>
                            }
                          </Stack>
                          <MobileStepper
                            variant="dots"
                            steps={2}
                            position="static"
                            activeStep={activeStep}
                            sx={{
                              width: "auto", // opcional, puedes controlar el ancho total
                              bgcolor: "transparent",
                              pb: 0,
                            }}
                            slotProps={{
                              dot: {
                                sx: {
                                  backgroundColor: 'grey.400',
                                  '&.MuiMobileStepper-dotActive': {
                                    backgroundColor: 'secondary.main',
                                  },
                                },
                              },
                            }}
                            nextButton={
                              <Button size="small" onClick={handleNext} disabled={activeStep === 5} color="secondary" sx={{ mx: 1 }}>
                                {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
                              </Button>
                            }
                            backButton={
                              <Button size="small" onClick={handleBack} disabled={activeStep === 0} color="secondary" sx={{ mx: 1 }}>
                                {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
                              </Button>
                            }
                          />
                        </Stack>


                      </Stack>
                    </CustomPaper>
                  </ImageListItem>

                  <ImageListItem cols={isMd ? 4 : 2} rows={2} sx={{ p: 1 }}>
                    <CustomPaper elevation={0} sx={{ pb: 2.5 }}>
                      <Stack spacing={2}>
                        <Typography variant="h5">Experts ratings</Typography>

                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={2}
                          alignItems="center"
                          sx={{ width: "100%" }}
                        >
                          <FormControl size="small" sx={{ width: { xs: "100%", sm: "auto" } }}>
                            <InputLabel color="info">Expert</InputLabel>
                            <Select
                              value={selectedExpert}
                              label="Expert"
                              color="info"
                              onChange={(e) => {
                                setSelectedExpert(e.target.value);
                                const newCriteria = Object.keys(
                                  issue.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations?.[e.target.value] || {}
                                );
                                setSelectedCriterion(newCriteria[0] || "");
                              }}
                            >
                              {expertList.map((expert) => (
                                <MenuItem key={expert} value={expert}>
                                  {expert}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>

                          <FormControl size="small" sx={{ width: { xs: "100%", sm: "auto" } }}>
                            <InputLabel color="info">Criterion</InputLabel>
                            <Select
                              value={selectedCriterion}
                              label="Criterion"
                              color="info"
                              onChange={(e) => setSelectedCriterion(e.target.value)}
                            >
                              {criterionList.map((criterion) => (
                                <MenuItem key={criterion} value={criterion}>
                                  {criterion}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>

                          <ToggleButton
                            selected={showCollective}
                            onChange={() => setShowCollective(!showCollective)}
                            color="secondary"
                            sx={{ width: { xs: "100%", sm: "auto" } }}
                          >
                            Show collective
                          </ToggleButton>
                        </Stack>

                        <MatrixAltPair
                          alternatives={issue.summary.alternatives}
                          evaluations={evaluations}
                          collectiveEvaluations={collectiveEvaluations}
                          permitEdit={false}
                        />
                      </Stack>
                    </CustomPaper>

                  </ImageListItem>
                </ImageList>

                {issue.summary.consensusInfo.consensusReachedPhase !== 1 && (
                  <Stack direction="row" spacing={2}>
                    <IconButton
                      variant="text"
                      color="secondary"
                      disabled={currentPhaseIndex === 0}
                      onClick={() => handleChangeCriterion(currentPhaseIndex - 1)}
                    >
                      <ArrowBackIosIcon />
                    </IconButton>
                    <IconButton
                      variant="text"
                      color="secondary"
                      disabled={currentPhaseIndex === issue.summary.consensusInfo.consensusReachedPhase - 1}
                      onClick={() => handleChangeCriterion(currentPhaseIndex + 1)}
                    >
                      <ArrowForwardIosIcon />
                    </IconButton>
                  </Stack>
                )}
              </Stack>
            </DialogContent>
          )}
      </Dialog >
    </>

  );
};

import {
  Chart as ChartJS,
  ScatterController,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Scatter } from 'react-chartjs-2';
import { useRef } from 'react';

// Registrar lo necesario
ChartJS.register(
  ScatterController,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Title,
  zoomPlugin
);

export const AnalyticalScatterChart = ({ data, phase, scatterPlotRef }) => {
  const current = data[phase];

  if (!current) return null;

  const expertPoints = Object.entries(current.expert_points).map(
    ([email, [x, y]]) => ({
      x,
      y,
      email,
    })
  );

  const collectivePoint = {
    x: current.collective_point[0],
    y: current.collective_point[1],
  };

  const chartData = {
    datasets: [
      {
        label: 'Experts',
        data: expertPoints,
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
        pointRadius: 8,
        pointHoverRadius: 11,
      },
      {
        label: 'Collective',
        data: [collectivePoint],
        backgroundColor: 'rgba(255, 99, 132, 1)',
        pointRadius: 10,
        pointStyle: 'rectRot',
        pointHoverRadius: 13,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // ¡Esto es clave!
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: "white",
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const { datasetIndex, raw } = context;
            if (datasetIndex === 0) {
              return `${raw.email} (${raw.x.toFixed(2)}, ${raw.y.toFixed(2)})`;
            } else {
              return `Collective (${raw.x.toFixed(2)}, ${raw.y.toFixed(2)})`;
            }
          },
        },
      },
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'xy',
        },
        pan: {
          enabled: true,
          mode: 'xy',
        },
      },
    },
    scales: {
      x: {
        min: -1,
        max: 1,
        type: 'linear',
        position: 'bottom',
        title: { display: false, text: 'Component2' },
        grid: {
          color: 'gray', // líneas del grid vertical
        },
        ticks: {
          color: 'white', // color de los números del eje Y
        },
      },
      y: {
        min: -1,
        max: 1,
        title: { display: false, text: 'Component1' },
        grid: {
          color: '#586872', // líneas del grid horizontal
        },
        ticks: {
          color: 'white', // color de los números del eje Y
          stepSize: 0.4,  // Aquí defines el incremento entre ticks en el eje X
        },
      },
    },
  };

  return (
    <>
      <Scatter ref={scatterPlotRef} data={chartData} options={chartOptions} />
    </>
  );
}

import { Chart } from "chart.js/auto";

export const AnalyticalConsensusLineChart = ({ data, consensusLevelChartRef }) => {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!data || !data.labels || !data.data || !canvasRef.current) return;

    // Destruye el gráfico anterior si existe
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const chartData = {
      labels: data.labels,
      datasets: [
        {
          label: 'Consensus level',
          data: data.data,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.2,
          fill: true,
          pointRadius: 6,
          pointHoverRadius: 9,
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
          labels: {
            color: 'white',
          },
        },
        tooltip: {
          callbacks: {
            label: (context) =>
              `Level: ${(context.raw * 100).toFixed(1)}%`,
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Round',
            color: 'white',
          },
          ticks: { color: 'white' },
          grid: { color: 'gray' },
        },
        y: {
          min: 0,
          max: 1,
          title: {
            display: true,
            text: 'Consensus level (%)',
            color: 'white',
          },
          ticks: {
            color: 'white',
            stepSize: 0.2,
            callback: (value) => `${(value * 100).toFixed(0)}`,
          },
          grid: { color: '#586872' },
        },
      },
    };

    const newChart = new Chart(canvasRef.current, {
      type: 'line',
      data: chartData,
      options: chartOptions,
    });

    chartInstanceRef.current = newChart;

    if (consensusLevelChartRef) {
      consensusLevelChartRef.current = {
        resetZoom: () => newChart.resetZoom(),
      };
    }

    return () => {
      newChart.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return <canvas ref={canvasRef} id="line-canvas" />;
};
