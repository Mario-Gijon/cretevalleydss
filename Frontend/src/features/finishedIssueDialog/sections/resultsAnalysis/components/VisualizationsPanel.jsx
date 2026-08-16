import { Alert, Box, Button, Chip, Stack, Typography } from "@mui/material";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import CenterFocusStrongRoundedIcon from "@mui/icons-material/CenterFocusStrongRounded";

import { AnalyticalScatterChart } from "../../../graphs/components/AnalyticalScatterChart";
import { ComparativeAnalyticalScatterChart } from "../../../graphs/components/ComparativeAnalyticalScatterChart";
import { AnalyticalConsensusLineChart } from "../../../graphs/components/AnalyticalConsensusLineChart";
import { RESULTS_ANALYSIS_SLOT_COLORS } from "../logic/resultsAnalysisColors.js";
import RankingMovementChart from "./RankingMovementChart.jsx";
import { buildGenericRankingMovement } from "../logic/buildGenericRankingMovement.js";

const cardSx = { border: "1px solid rgba(83,198,214,0.16)", bgcolor: "rgba(8,18,29,0.88)", borderRadius: 3, p: { xs: 1.5, sm: 2 }, minWidth: 0 };
const chartFrameSx = { width: "100%", height: { xs: 360, sm: 430, md: 500, xl: 540 }, maxHeight: 540, minHeight: 0 };
const compactChartFrameSx = { width: "100%", height: { xs: 320, md: 380 }, maxHeight: 400, minHeight: 0 };

const unavailableMessage = (reason) => {
  if (reason === "insufficient_variation_for_projection") return "The analytical projection is unavailable because all expert inputs are equivalent.";
  if (reason === "insufficient_points_for_projection") return "The analytical projection is unavailable because there are not enough expert points.";
  if (reason === "projection_failed") return "The stored analytical projection could not be generated.";
  return "No stored expert–collective analytical projection is available for this execution.";
};

const Header = ({ title, subtitle, resettable, onResetZoom }) => (
  <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start" sx={{ mb: 1.25 }}>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
      <AnalyticsIcon fontSize="small" color="secondary" />
      <Box><Typography variant="h6" component="h2">{title}</Typography><Typography variant="body2" color="text.secondary">{subtitle}</Typography></Box>
    </Stack>
    {resettable ? <Button variant="outlined" color="secondary" size="small" startIcon={<CenterFocusStrongRoundedIcon />} onClick={onResetZoom}>Reset zoom</Button> : null}
  </Stack>
);

const GroupChips = ({ group }) => (
  <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" sx={{ mb: 0.9 }}>
    {group.representedExecutions.map((execution) => <Chip key={execution.key} label={execution.label} title={execution.fullLabel} size="small" sx={{ borderColor: execution.color, color: execution.color }} variant="outlined" />)}
    {group.id === group.referenceGroupId ? <Chip label="Reference projection" size="small" variant="outlined" /> : null}
  </Stack>
);

const ConsensusCard = ({ consensus }) => (
  <Box sx={cardSx}>
    <Header title="Consensus evolution" subtitle="Consensus level by phase." />
    {consensus.available ? <Box sx={chartFrameSx}><AnalyticalConsensusLineChart data={consensus.graph} /></Box> : <Typography variant="body2" color="text.secondary" sx={{ minHeight: 100, display: "grid", placeItems: "center" }}>No finite consensus progression data is available.</Typography>}
  </Box>
);

const SingleVisualization = ({ visualizations, scatterPlotRef, onResetZoom }) => {
  const scatter = visualizations.singleScatter;
  return <Stack spacing={1.4}>
    <Box>
      <Box sx={cardSx}>
        <Header title="Expert–collective map" subtitle="Dispersion of expert points and the collective position." resettable={scatter?.available} onResetZoom={onResetZoom} />
        {scatter?.available ? <Box sx={chartFrameSx}><AnalyticalScatterChart data={scatter.data} phase={scatter.sourcePhase} scatterPlotRef={scatterPlotRef} color={RESULTS_ANALYSIS_SLOT_COLORS[0]} /></Box> : <Typography variant="body2" color="text.secondary" sx={{ minHeight: 180, display: "grid", placeItems: "center" }}>{unavailableMessage(scatter?.unavailableReason)}</Typography>}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Coordinates come from the stored analytical projection for this execution.</Typography>
      </Box>
    </Box>
  </Stack>;
};

const ComparisonVisualization = ({ comparison, scatterPlotRef, onResetZoom }) => {
  if (comparison.presentation === "unavailable") return <Box sx={cardSx}><Header title="Comparative visualizations" subtitle="Stored analytical projections." /><Typography color="text.secondary" sx={{ minHeight: 180, display: "grid", placeItems: "center", textAlign: "center" }}>{comparison.footerMessage}</Typography></Box>;
  if (comparison.presentation === "separate") return <Stack spacing={1.1}>
    {comparison.footerMessages.map((message) => <Typography variant="body2" key={message} color="text.secondary">{message}</Typography>)}
    {comparison.unavailableExecutions.filter((execution) => !execution.displayAvailable).length ? <Typography variant="body2" color="text.secondary">Unavailable stored projection: {comparison.unavailableExecutions.filter((execution) => !execution.displayAvailable).map((execution) => execution.executionName).join(", ")}.</Typography> : null}
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" }, gap: 1.4 }}>
      {comparison.separateExecutions.map((group) => <Box key={group.id} sx={cardSx}><Header title="Expert–collective map" subtitle="Stored projection shown separately." /> <GroupChips group={{ ...group, referenceGroupId: comparison.referenceGroupId }} />{group.equalityMessage ? <Typography variant="caption" color="text.secondary" sx={{ mb: 0.8 }}>{group.equalityMessage}</Typography> : null}<Box sx={compactChartFrameSx}><ComparativeAnalyticalScatterChart groups={[group]} compact /></Box></Box>)}
    </Box>
  </Stack>;
  const groups = comparison.presentation === "shared" ? [comparison.sharedProjection] : comparison.alignedExecutions;
  return <Box sx={cardSx}>
    <Header title="Expert–collective map" subtitle="Dispersion of expert points and the collective position." resettable onResetZoom={onResetZoom} />
    <Box sx={{ ...chartFrameSx, mt: 1 }}><ComparativeAnalyticalScatterChart groups={groups} scatterPlotRef={scatterPlotRef} /></Box>
    <Stack spacing={0.3} sx={{ mt: 1 }}>{comparison.footerMessages.map((message) => <Typography variant="caption" key={message} color="text.secondary">{message}</Typography>)}</Stack>
  </Box>;
};

const RankingEvolution = ({ executions }) => <Box sx={cardSx}>
  <Header title="Ranking evolution" subtitle="Position changes across consensus phases." />
  <Box data-testid="ranking-evolution-comparison" sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: executions.length > 1 ? `${"minmax(0, 1fr) 1px ".repeat(Math.min(executions.length, 3) - 1)}minmax(0, 1fr)` : "minmax(0, 1fr)", xl: executions.length > 1 ? `${"minmax(0, 1fr) 1px ".repeat(Math.min(executions.length, 3) - 1)}minmax(0, 1fr)` : "minmax(0, 1fr)" }, gap: 1.4, minWidth: 0, overflowX: "hidden", overflowY: "hidden" }}>
    {executions.flatMap((execution, index) => {
      const visualization = execution.genericAnalysis?.visualizations?.find((entry) => entry?.type === "rankingEvolution");
      const panel = <Box key={execution.key} data-testid="ranking-evolution-execution" sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 0.8 }}>{execution.displayLabel}</Typography>
        {visualization ? <RankingMovementChart movement={buildGenericRankingMovement(visualization)} embedded /> : <Alert severity="info">Ranking evolution is not available for this execution.</Alert>}
      </Box>;
      return index < executions.length - 1
        ? [panel, <Box key={`${execution.key}-divider`} data-testid="ranking-evolution-divider" aria-hidden="true" sx={{ bgcolor: "rgba(83,198,214,0.22)", width: "100%", height: { xs: "1px", md: "100%" } }} />]
        : [panel];
    })}
  </Box>
</Box>;

const VisualizationsPanel = ({ visualizations = {}, executions = [], scatterPlotRef, onResetZoom }) => {
  const modelVisualizations = visualizations.mode === "comparison"
    ? <ComparisonVisualization comparison={visualizations.expertCollectiveComparison} scatterPlotRef={scatterPlotRef} onResetZoom={onResetZoom} />
    : <SingleVisualization visualizations={visualizations} scatterPlotRef={scatterPlotRef} onResetZoom={onResetZoom} />;
  return <Stack spacing={2}>
    <Box>
      <Typography variant="h5" component="h2" sx={{ mb: 0.4, fontWeight: 900 }}>General visualizations</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>General analytical views of the completed decision process.</Typography>
      <RankingEvolution executions={executions} />
      <Box sx={{ mt: 1.4, display: "grid", gridTemplateColumns: visualizations.consensus?.enabled ? { xs: "1fr", lg: "minmax(0, 1.35fr) minmax(300px, 0.85fr)" } : "1fr", gap: 1.4 }}>
        {modelVisualizations}
        {visualizations.consensus?.enabled ? <ConsensusCard consensus={visualizations.consensus} /> : null}
      </Box>
    </Box>
  </Stack>;
};

export default VisualizationsPanel;
