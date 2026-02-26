// FinishedIssueDialog.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Stack,
  Typography,
  Box,
  Divider,
  IconButton,
  Tabs,
  Tab,
  Backdrop,
  Button,
  List,
  ListItem,
  ListItemButton,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  Chip,
  Tooltip,
  MobileStepper,
  useMediaQuery,
  Avatar,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import AnalyticsIcon from "@mui/icons-material/Analytics";

import { getFinishedIssueInfo } from "../../controllers/issueController";
import { CircularLoading } from "../LoadingProgress/CircularLoading";
import { PairwiseMatrix } from "../PairwiseMatrix/PairwiseMatrix";
import { Matrix } from "../Matrix/Matrix";

import { GlassPaper } from "../StyledComponents/GlassPaper";
import { GlassDialog } from "../StyledComponents/GlassDialog";
import { CriterionItem } from "../CriteriaList/CriteriaList";
import { extractLeafCriteria } from "../../utils/evaluationPairwiseMatrixDialogUtils";

// charts
import { Scatter } from "react-chartjs-2";
import { Chart } from "chart.js/auto";
import zoomPlugin from "chartjs-plugin-zoom";
import {
  Chart as ChartJS,
  ScatterController,
  LinearScale,
  PointElement,
  Tooltip as CTooltip,
  Legend,
  Title,
} from "chart.js";

ChartJS.register(ScatterController, LinearScale, PointElement, CTooltip, Legend, Title, zoomPlugin);

/* -----------------------------
 * Shared tiny UI helpers (look ActiveIssues)
 * ----------------------------- */

const auroraBg = (theme, intensity = 0.16) => ({
  backgroundImage: `radial-gradient(1200px 520px at 12% 0%, ${alpha(
    theme.palette.info.main,
    intensity
  )}, transparent 62%),
                    radial-gradient(900px 460px at 0% 0%, ${alpha(
                      theme.palette.secondary.main,
                      intensity
                    )}, transparent 58%)`,
});

const crystalBorder = () => ({ border: "1px solid rgba(255,255,255,0.10)" });

const glassSx = (theme) => ({
  backgroundColor: alpha("#050e22", 0.3),
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  boxShadow: `0 18px 50px ${alpha(theme.palette.common.black, 0.14)}`,
  ...crystalBorder(),
});

const Pill = ({ tone = "success", children }) => {
  const theme = useTheme();
  const map = {
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
    secondary: theme.palette.secondary.main,
  };
  const c = map[tone] || theme.palette.info.main;

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        px: 1.2,
        py: 0.55,
        borderRadius: 999,
        bgcolor: alpha(c, 0.12),
        color: c,
        fontSize: 12,
        fontWeight: 950,
        width: "fit-content",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: `0 10px 26px ${alpha(theme.palette.common.black, 0.10)}`,
      }}
    >
      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: alpha(c, 0.85) }} />
      <span>{children}</span>
    </Box>
  );
};

const SectionCard = ({ title, icon, right, children, sx }) => {
  const theme = useTheme();
  return (
    <GlassPaper
      elevation={0}
      sx={{
        borderRadius: 5,
        p: { xs: 1.5, md: 2 },
        ...glassSx(theme, 0.14),
        ...auroraBg(theme, 0.08),
        position: "relative",
        overflow: "hidden",
        "&:after": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.10)}, transparent 15%)`,
          opacity: 0.22,
        },
        ...(sx || {}),
      }}
    >
      {(title || right) && (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1.25, position: "relative", zIndex: 1 }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            {icon ? (
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: alpha(theme.palette.secondary.main, 0.12),
                  color: "secondary.main",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                {icon}
              </Avatar>
            ) : null}

            {title ? (
              <Typography variant="subtitle1" sx={{ fontWeight: 980, lineHeight: 1, whiteSpace: "nowrap" }}>
                {title}
              </Typography>
            ) : null}
          </Stack>

          {right ? <Box sx={{ position: "relative", zIndex: 1 }}>{right}</Box> : null}
        </Stack>
      )}

      <Box sx={{ position: "relative", zIndex: 1 }}>{children}</Box>
    </GlassPaper>
  );
};

const Row = ({ label, value }) => (
  <Stack direction="row" spacing={1}>
    <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary" }}>
      {label}:
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 850, color: "text.primary", wordBreak: "break-word" }}>
      {value ?? "—"}
    </Typography>
  </Stack>
);

/**
 * ✅ Accordion row "sin caja": misma columna de label que Row,
 * y el contenido cae alineado bajo la columna de "value" (no indent feo)
 */
const SummaryAccordionRow = ({ label, open, onToggle, right, children }) => {
  const theme = useTheme();

  return (
    <Box>
      <ListItemButton
        disableGutters
        onClick={onToggle}
        sx={{
          px: 0,
          py: 0.45,
          borderRadius: 1.25,
          bgcolor: "transparent",
          "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.04) },
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 950,
              color: "text.secondary",
            }}
          >
            {label}
          </Typography>

          <Box sx={{ flex: 1 }} />

          {right ? <Box sx={{ mr: 0.5 }}>{right}</Box> : null}

          <Box sx={{ opacity: 0.85 }}>{open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}</Box>
        </Stack>
      </ListItemButton>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box sx={{ pt: 0.6 }}>
          <Stack direction="row" alignItems="flex-start" pl={1}>
            <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
};

/* -----------------------------
 * Main dialog
 * ----------------------------- */

export const FinishedIssueDialog = ({
  selectedIssue,
  openFinishedIssueDialog,
  handleCloseFinishedIssueDialog,
  setOpenRemoveConfirmDialog,
}) => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));

  const scatterPlotRef = useRef(null);
  const consensusLevelChartRef = useRef(null);

  const resetZoom = (chartRef) => chartRef?.current?.resetZoom?.();

  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);

  // summary accordions
  const [openDescriptionList, setOpenDescriptionList] = useState(false);
  const [openCriteriaList, setOpenCriteriaList] = useState(false);
  const [openAlternativeList, setOpenAlternativesList] = useState(false);
  const [openConsensusInfoList, setOpenConsensusInfoList] = useState(false);
  const [openExpertsList, setOpenExpertsList] = useState(false);

  const [loadingInfo, setLoadingInfo] = useState(false);
  const [issue, setIssue] = useState({});

  // graphs stepper
  const [activeStep, setActiveStep] = useState(0);
  const handleNext = () => setActiveStep((p) => Math.min(1, p + 1));
  const handleBack = () => setActiveStep((p) => Math.max(0, p - 1));

  // ratings selectors
  const [showCollective, setShowCollective] = useState(false);

  const initialExpert =
    Object.keys(issue.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations || {})[0] || "";
  const [selectedExpert, setSelectedExpert] = useState(initialExpert);

  const initialCriterion = issue?.summary?.isPairwise
    ? Object.keys(issue.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations?.[initialExpert] || {})[0] || ""
    : null;
  const [selectedCriterion, setSelectedCriterion] = useState(initialCriterion);

  useEffect(() => {
    const fetchIssue = async () => {
      try {
        setLoadingInfo(true);
        const response = await getFinishedIssueInfo(selectedIssue?.id);
        const loadedIssue = response?.issueInfo;

        const phaseKeys = Object.keys(loadedIssue?.expertsRatings || {})
          .map((k) => parseInt(k))
          .filter((k) => !isNaN(k));

        const lastConsensusPhaseIndex = Math.max(...phaseKeys, 0) - 1;

        setIssue(loadedIssue || {});
        setCurrentPhaseIndex(Math.max(0, lastConsensusPhaseIndex));

        // reset UI per issue load
        setActiveStep(0);
        setShowCollective(false);
        setOpenDescriptionList(false);
        setOpenCriteriaList(false);
        setOpenAlternativesList(false);
        setOpenConsensusInfoList(false);
        setOpenExpertsList(false);
      } finally {
        setLoadingInfo(false);
      }
    };

    if (selectedIssue?.id) fetchIssue();
  }, [selectedIssue]);

  useEffect(() => {
    const newExpert = Object.keys(issue.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations || {})[0] || "";
    const newCriterion =
      Object.keys(issue.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations?.[newExpert] || {})[0] || "";

    setSelectedExpert(newExpert);
    setSelectedCriterion(newCriterion);
  }, [issue, currentPhaseIndex]);

  const isPairwise = Boolean(issue?.summary?.isPairwise);

  const expertList = useMemo(
    () => Object.keys(issue.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations || {}),
    [issue, currentPhaseIndex]
  );

  const criterionList = useMemo(() => {
    if (!isPairwise) return [];
    return Object.keys(issue.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations?.[selectedExpert] || {});
  }, [issue, currentPhaseIndex, selectedExpert, isPairwise]);

  const evaluations = useMemo(() => {
    if (isPairwise) {
      return issue.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations?.[selectedExpert]?.[selectedCriterion] || [];
    }
    return issue.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations?.[selectedExpert] || {};
  }, [issue, currentPhaseIndex, selectedExpert, selectedCriterion, isPairwise]);

  const collectiveEvaluations = useMemo(() => {
    if (!showCollective) return isPairwise ? [] : {};
    if (isPairwise) {
      return issue.expertsRatings?.[currentPhaseIndex + 1]?.collectiveEvaluations?.[selectedCriterion] || [];
    }
    return issue.expertsRatings?.[currentPhaseIndex + 1]?.collectiveEvaluations || {};
  }, [issue, currentPhaseIndex, selectedCriterion, showCollective, isPairwise]);

  const ranking = issue?.alternativesRankings?.[currentPhaseIndex]?.ranking ?? [];
  const lastIndex = ranking.length - 1;

  const roundsCount = issue?.summary?.consensusInfo?.consensusReachedPhase || 0;
  const showRounds = Boolean(issue?.summary?.consensusInfo && roundsCount > 1);

  const formatScore = (num) =>
    new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);

  const handleChangePhase = (index) => {
    setCurrentPhaseIndex(index);
    setActiveStep(0);
    setShowCollective(false);
  };

  const participated = issue.summary?.experts?.participated || [];
  const notAccepted = issue.summary?.experts?.notAccepted || [];
  const totalExperts = participated.length + notAccepted.length;

  return (
    <GlassDialog
      open={openFinishedIssueDialog}
      onClose={handleCloseFinishedIssueDialog}
      fullScreen
      PaperProps={{
        elevation: 0,
        sx: {
          bgcolor: alpha("#070B10", 0.72),
          ...auroraBg(theme, 0.10),
          backdropFilter: "blur(10px)",
        },
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          px: { xs: 1.5, md: 2.25 },
          pt: 1.35,
          pb: 1.15,
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: "1px solid rgba(255,255,255,0.10)",
          background: alpha("#0B1118", 0.55),
          backdropFilter: "blur(12px)",
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor: alpha(theme.palette.success.main, 0.14),
                color: "success.main",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <AssignmentTurnedInIcon />
            </Avatar>

            <Stack spacing={0.2} sx={{ minWidth: 0 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 980,
                  lineHeight: 1.05,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={selectedIssue?.name || ""}
              >
                {selectedIssue?.name || "Finished issue"}
              </Typography>

              {/* <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <Pill tone="success">Finished</Pill>
                {showRounds ? <Pill tone="info">{roundsCount} rounds</Pill> : null}
              </Stack> */}
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Remove issue" arrow>
              <IconButton
                onClick={() => setOpenRemoveConfirmDialog(true)}
                sx={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  bgcolor: alpha(theme.palette.error.main, 0.10),
                  "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.14) },
                }}
              >
                <DeleteOutlineIcon color="error" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Close" arrow>
              <IconButton
                onClick={handleCloseFinishedIssueDialog}
                sx={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  bgcolor: alpha(theme.palette.common.white, 0.06),
                  "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.09) },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* ROUNDS TABS */}
        {showRounds ? (
          <Box sx={{ mt: 1.25 }}>
            <Tabs
              value={currentPhaseIndex}
              onChange={(_, v) => handleChangePhase(v)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              indicatorColor="secondary"
              textColor="inherit"
              sx={{
                minHeight: 40,
                "& .MuiTab-root": {
                  minHeight: 40,
                  textTransform: "none",
                  fontWeight: 950,
                  borderRadius: 999,
                  px: 2.0,
                  mr: 1,
                  bgcolor: alpha(theme.palette.common.white, 0.04),
                  border: "1px solid rgba(255,255,255,0.10)",
                },
                "& .MuiTab-root.Mui-selected": {
                  bgcolor: alpha(theme.palette.secondary.main, 0.12),
                  borderColor: alpha(theme.palette.secondary.main, 0.35),
                },
                "& .MuiTabs-indicator": { height: 0 },
              }}
            >
              {Array.from({ length: roundsCount }).map((_, idx) => (
                <Tab key={idx} label={`Round ${idx + 1}`} />
              ))}
            </Tabs>
          </Box>
        ) : null}
      </Box>

      {/* LOADING */}
      {loadingInfo || !issue?.summary ? (
        <Backdrop open sx={{ zIndex: 999999 }}>
          <CircularLoading color="secondary" size={50} height="50vh" />
        </Backdrop>
      ) : (
        <Box sx={{ px: { xs: 1.5, md: 2.25 }, py: 2 }}>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: isMdUp ? "minmax(0, 1fr) minmax(0, 1fr)" : "1fr",
              gridTemplateAreas: isMdUp
                ? `
                    "summary ranking"
                    "analysis analysis"
                    "graphs graphs"
                    "ratings ratings"
                  `
                : `
                    "summary"
                    "ranking"
                    "analysis"
                    "graphs"
                    "ratings"
                  `,
              alignItems: "stretch",
            }}
          >
            {/* SUMMARY */}
            <Box sx={{ gridArea: "summary", minWidth: 0 }}>
              <SectionCard title="Summary" icon={<AssignmentTurnedInIcon fontSize="small" />}>
                <Stack spacing={1.1}>
                  <Row label="Name" value={issue.summary?.name} />
                  <Row label="Admin" value={issue.summary?.admin} />

                  {/* ✅ Description (row-accordion, no box, aligned) */}
                  <SummaryAccordionRow
                    label="Description"
                    open={openDescriptionList}
                    onToggle={() => setOpenDescriptionList((v) => !v)}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 850, color: "text.primary" }}>
                      {issue.summary?.description || "—"}
                    </Typography>
                  </SummaryAccordionRow>

                  <Row label="Model" value={issue.summary?.model} />

                  {/* ✅ Criteria */}
                  {Array.isArray(issue.summary?.criteria) && issue.summary.criteria.length > 1 ? (
                    <SummaryAccordionRow
                      label="Criteria"
                      open={openCriteriaList}
                      onToggle={() => setOpenCriteriaList((v) => !v)}
                    >
                      <List disablePadding sx={{ py: 0.25 }}>
                        {issue.summary.criteria.map((criterion, index) => (
                          <CriterionItem key={index} criterion={criterion} isChild={false} />
                        ))}
                      </List>
                    </SummaryAccordionRow>
                  ) : (
                    <Row label="Criterion" value={issue.summary?.criteria?.[0]?.name} />
                  )}

                  {/* ✅ Alternatives */}
                  <SummaryAccordionRow
                    label="Alternatives"
                    open={openAlternativeList}
                    onToggle={() => setOpenAlternativesList((v) => !v)}
                  >
                    <Stack spacing={0.5}>
                      {(issue.summary?.alternatives || []).map((alt, idx) => (
                        <Typography key={idx} variant="body2" sx={{ fontWeight: 850 }}>
                          {alt}
                        </Typography>
                      ))}
                    </Stack>
                  </SummaryAccordionRow>

                  {/* ✅ Experts (1 accordion, sin sub-indent) */}
                  <SummaryAccordionRow
                    label="Experts"
                    open={openExpertsList}
                    onToggle={() => setOpenExpertsList((v) => !v)}
                    right={<Pill tone="info">{totalExperts}</Pill>}
                  >
                    <Stack spacing={1}>
                      <Stack spacing={0.5}>
                        {participated.map((e, idx) => (
                          <Typography key={idx} variant="body2" sx={{ fontWeight: 850 }}>
                            {e}
                          </Typography>
                        ))}
                      </Stack>

                      {notAccepted.length ? (
                        <>
                          <Divider sx={{ opacity: 0.14 }} />
                          <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary" }}>
                            Not accepted
                          </Typography>
                          <Stack spacing={0.5}>
                            {notAccepted.map((e, idx) => (
                              <Typography key={idx} variant="body2" sx={{ fontWeight: 850 }}>
                                {e}
                              </Typography>
                            ))}
                          </Stack>
                        </>
                      ) : null}
                    </Stack>
                  </SummaryAccordionRow>

                  <Row label="Creation date" value={issue.summary?.creationDate} />
                  {issue.summary?.closureDate ? <Row label="Closure date" value={issue.summary?.closureDate} /> : null}

                  {/* ✅ Consensus info */}
                  {issue.summary?.consensusInfo ? (
                    <SummaryAccordionRow
                      label="Consensus info"
                      open={openConsensusInfoList}
                      onToggle={() => setOpenConsensusInfoList((v) => !v)}
                    >
                      <Stack spacing={0.8}>
                        {issue.summary.consensusInfo?.consensusReached ? (
                          <Row label="Reached" value={String(issue.summary.consensusInfo.consensusReached)} />
                        ) : null}
                        {issue.summary.consensusInfo?.maximumPhases ? (
                          <Row label="Maximum rounds" value={issue.summary.consensusInfo.maximumPhases || "Unlimited"} />
                        ) : null}
                        {issue.summary.consensusInfo?.threshold ? (
                          <Row label="Threshold" value={String(issue.summary.consensusInfo.threshold)} />
                        ) : null}
                      </Stack>
                    </SummaryAccordionRow>
                  ) : null}
                </Stack>
              </SectionCard>
            </Box>

            {/* RANKING */}
            <Box sx={{ gridArea: "ranking", minWidth: 0 }}>
              <SectionCard title="Results ranking" icon={<AssignmentTurnedInIcon fontSize="small" />}>
                {!issue?.alternativesRankings ? (
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                    Ranking not available.
                  </Typography>
                ) : (
                  <List sx={{ width: "100%" }} disablePadding>
                    {ranking.map((item, index) => (
                      <ListItem key={item.name} sx={{ px: 0, py: 0.9 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%" spacing={2}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 980, opacity: 0.9 }}>
                              {index + 1}.
                            </Typography>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: 980,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                minWidth: 0,
                              }}
                              title={item.name}
                            >
                              {item.name}
                            </Typography>
                          </Stack>

                          <Chip
                            label={formatScore(item.score)}
                            variant="outlined"
                            color={index === 0 ? "success" : index === lastIndex ? "error" : "secondary"}
                            sx={{
                              fontWeight: 950,
                              borderColor: "rgba(255,255,255,0.18)",
                              bgcolor: alpha(theme.palette.background.paper, 0.08),
                            }}
                          />
                        </Stack>
                      </ListItem>
                    ))}
                  </List>
                )}
              </SectionCard>
            </Box>

            {/* ANALYSIS */}
            <Box sx={{ gridArea: "analysis", minWidth: 0 }}>
              <SectionCard title="Results analysis" icon={<AnalyticsIcon fontSize="small" />}>
                {!issue?.consensusSection ? (
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                    Section is not available yet
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ fontWeight: 850 }}>
                    {issue.consensusSection}
                  </Typography>
                )}
              </SectionCard>
            </Box>

            {/* GRAPHS */}
            <Box sx={{ gridArea: "graphs", minWidth: 0 }}>
              {issue?.analyticalGraphs ? (
                <SectionCard
                  title="Analytical graphs"
                  icon={<AnalyticsIcon fontSize="small" />}
                  right={
                    activeStep === 0 && issue?.analyticalGraphs?.scatterPlot ? (
                      <Button
                        variant="outlined"
                        color="secondary"
                        size="small"
                        onClick={() => resetZoom(scatterPlotRef)}
                        sx={{ borderColor: "rgba(255,255,255,0.16)" }}
                      >
                        Reset zoom
                      </Button>
                    ) : null
                  }
                >
                  <Stack spacing={2} alignItems="center">
                    <Box sx={{ width: "100%", height: { xs: 290, md: 520 } }}>
                      {activeStep === 0 && issue?.analyticalGraphs?.scatterPlot ? (
                        <AnalyticalScatterChart
                          data={issue.analyticalGraphs.scatterPlot}
                          phase={currentPhaseIndex}
                          scatterPlotRef={scatterPlotRef}
                        />
                      ) : null}

                      {activeStep === 1 && issue?.analyticalGraphs?.consensusLevelLineChart ? (
                        <AnalyticalConsensusLineChart
                          data={issue.analyticalGraphs.consensusLevelLineChart}
                          consensusLevelChartRef={consensusLevelChartRef}
                        />
                      ) : null}
                    </Box>

                    {issue.analyticalGraphs?.consensusLevelLineChart?.data?.length > 1 ? (
                      <MobileStepper
                        variant="dots"
                        steps={2}
                        position="static"
                        activeStep={activeStep}
                        sx={{
                          width: "auto",
                          bgcolor: "transparent",
                          pb: 0,
                          "& .MuiMobileStepper-dot": { bgcolor: alpha(theme.palette.common.white, 0.26) },
                          "& .MuiMobileStepper-dotActive": { bgcolor: theme.palette.secondary.main },
                        }}
                        nextButton={
                          <Button size="small" onClick={handleNext} disabled={activeStep === 1} color="secondary" sx={{ mx: 1 }}>
                            {theme.direction === "rtl" ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
                          </Button>
                        }
                        backButton={
                          <Button size="small" onClick={handleBack} disabled={activeStep === 0} color="secondary" sx={{ mx: 1 }}>
                            {theme.direction === "rtl" ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
                          </Button>
                        }
                      />
                    ) : null}
                  </Stack>
                </SectionCard>
              ) : null}
            </Box>

            {/* EXPERTS RATINGS */}
            <Box sx={{ gridArea: "ratings", minWidth: 0 }}>
              <SectionCard title="Experts ratings" icon={<AnalyticsIcon fontSize="small" />}>
                <Stack spacing={2}>
                  {/* selectors row */}
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.25}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    sx={{ width: "100%" }}
                  >
                    <FormControl size="small" sx={{ width: { xs: "100%", sm: 280 } }}>
                      <InputLabel color="info">Expert</InputLabel>
                      <Select
                        value={selectedExpert}
                        label="Expert"
                        color="info"
                        onChange={(e) => {
                          const v = e.target.value;
                          setSelectedExpert(v);

                          if (isPairwise) {
                            const newCriteria = Object.keys(
                              issue.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations?.[v] || {}
                            );
                            setSelectedCriterion(newCriteria[0] || "");
                          }
                        }}
                      >
                        {expertList.map((expert) => (
                          <MenuItem key={expert} value={expert}>
                            {expert}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {isPairwise ? (
                      <FormControl size="small" sx={{ width: { xs: "100%", sm: 280 } }}>
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
                    ) : null}

                    <Box sx={{ flex: 1 }} />

                    {issue.expertsRatings?.[currentPhaseIndex + 1]?.collectiveEvaluations ? (
                      <ToggleButton
                        selected={showCollective}
                        onChange={() => setShowCollective((v) => !v)}
                        color="secondary"
                        sx={{
                          borderRadius: 3,
                          borderColor: "rgba(255,255,255,0.14)",
                          bgcolor: alpha(theme.palette.background.paper, 0.06),
                          "&.Mui-selected": {
                            bgcolor: alpha(theme.palette.secondary.main, 0.14),
                            borderColor: alpha(theme.palette.secondary.main, 0.30),
                          },
                        }}
                      >
                        Show collective
                      </ToggleButton>
                    ) : null}
                  </Stack>

                  <Divider sx={{ opacity: 0.14 }} />

                  {/* matrix */}
                  {isPairwise ? (
                    <PairwiseMatrix
                      alternatives={issue.summary?.alternatives || []}
                      evaluations={evaluations}
                      collectiveEvaluations={collectiveEvaluations}
                      permitEdit={false}
                    />
                  ) : (
                    <Matrix
                      alternatives={issue.summary?.alternatives || []}
                      criteria={extractLeafCriteria(issue.summary?.criteria || []).map((c) => c.name)}
                      evaluations={evaluations}
                      collectiveEvaluations={collectiveEvaluations}
                      permitEdit={false}
                    />
                  )}
                </Stack>
              </SectionCard>
            </Box>
          </Box>

          {/* Bottom phase arrows */}
          {showRounds ? (
            <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: "center" }}>
              <IconButton
                color="secondary"
                disabled={currentPhaseIndex === 0}
                onClick={() => handleChangePhase(currentPhaseIndex - 1)}
                sx={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  bgcolor: alpha(theme.palette.common.white, 0.06),
                  "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.09) },
                }}
              >
                <ArrowBackIosIcon />
              </IconButton>

              <IconButton
                color="secondary"
                disabled={currentPhaseIndex === roundsCount - 1}
                onClick={() => handleChangePhase(currentPhaseIndex + 1)}
                sx={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  bgcolor: alpha(theme.palette.common.white, 0.06),
                  "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.09) },
                }}
              >
                <ArrowForwardIosIcon />
              </IconButton>
            </Stack>
          ) : null}
        </Box>
      )}
    </GlassDialog>
  );
};

/* -----------------------------
 * Charts
 * ----------------------------- */

export const AnalyticalScatterChart = ({ data, phase, scatterPlotRef }) => {
  const theme = useTheme();
  const current = data?.[phase];
  if (!current) return null;

  const expertPoints = Object.entries(current.expert_points || {}).map(([email, [x, y]]) => ({ x, y, email }));
  const collectivePoint = { x: current.collective_point?.[0], y: current.collective_point?.[1] };

  const chartData = {
    datasets: [
      {
        label: "Experts",
        data: expertPoints,
        backgroundColor: alpha(theme.palette.info.main, 0.85),
        pointRadius: 8,
        pointHoverRadius: 11,
      },
      {
        label: "Collective",
        data: [collectivePoint],
        backgroundColor: alpha(theme.palette.error.main, 0.95),
        pointRadius: 10,
        pointStyle: "rectRot",
        pointHoverRadius: 13,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: { color: alpha("#fff", 0.85) },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const { datasetIndex, raw } = ctx;
            if (datasetIndex === 0) return `${raw.email} (${raw.x.toFixed(2)}, ${raw.y.toFixed(2)})`;
            return `Collective (${raw.x.toFixed(2)}, ${raw.y.toFixed(2)})`;
          },
        },
      },
      zoom: {
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "xy" },
        pan: { enabled: true, mode: "xy" },
      },
    },
    scales: {
      x: {
        min: -1,
        max: 1,
        type: "linear",
        grid: { color: alpha("#fff", 0.14) },
        ticks: { color: alpha("#fff", 0.85) },
      },
      y: {
        min: -1,
        max: 1,
        grid: { color: alpha("#fff", 0.14) },
        ticks: { color: alpha("#fff", 0.85), stepSize: 0.4 },
      },
    },
  };

  return <Scatter ref={scatterPlotRef} data={chartData} options={chartOptions} />;
};

export const AnalyticalConsensusLineChart = ({ data, consensusLevelChartRef }) => {
  const theme = useTheme();
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!data?.labels || !data?.data || !canvasRef.current) return;

    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    const chartData = {
      labels: data.labels,
      datasets: [
        {
          label: "Consensus level",
          data: data.data,
          borderColor: alpha(theme.palette.secondary.main, 0.95),
          backgroundColor: alpha(theme.palette.secondary.main, 0.18),
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
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `Level: ${(ctx.raw * 100).toFixed(1)}%`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Round", color: alpha("#fff", 0.85) },
          ticks: { color: alpha("#fff", 0.85) },
          grid: { color: alpha("#fff", 0.14) },
        },
        y: {
          min: 0,
          max: 1,
          title: { display: true, text: "Consensus level (%)", color: alpha("#fff", 0.85) },
          ticks: {
            color: alpha("#fff", 0.85),
            stepSize: 0.2,
            callback: (v) => `${(v * 100).toFixed(0)}`,
          },
          grid: { color: alpha("#fff", 0.14) },
        },
      },
    };

    const newChart = new Chart(canvasRef.current, { type: "line", data: chartData, options: chartOptions });
    chartInstanceRef.current = newChart;

    if (consensusLevelChartRef) {
      consensusLevelChartRef.current = { resetZoom: () => newChart.resetZoom?.() };
    }

    return () => newChart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, theme.palette.secondary.main]);

  return <canvas ref={canvasRef} />;
};
