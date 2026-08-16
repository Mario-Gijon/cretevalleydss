import { Alert, Box, Button, Chip, Stack, Typography } from "@mui/material";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import CenterFocusStrongRoundedIcon from "@mui/icons-material/CenterFocusStrongRounded";
import FlagRoundedIcon from "@mui/icons-material/FlagRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";

import { AnalyticalScatterChart } from "../../../graphs/components/AnalyticalScatterChart";
import { ComparativeAnalyticalScatterChart } from "../../../graphs/components/ComparativeAnalyticalScatterChart";
import { AnalyticalConsensusLineChart } from "../../../graphs/components/AnalyticalConsensusLineChart";
import { RESULTS_ANALYSIS_SLOT_COLORS } from "../logic/resultsAnalysisColors.js";
import RankingMovementChart from "./RankingMovementChart.jsx";
import { buildGenericRankingMovement } from "../logic/buildGenericRankingMovement.js";
import { RANKING_ALTERNATIVE_COLORS } from "../logic/rankingAlternativeColors.js";

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

const ExecutionComparisonLayout = ({ executions, testId, dividerTestId, children }) => <Box data-testid={testId} sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: executions.length > 1 ? `${"minmax(0, 1fr) 1px ".repeat(Math.min(executions.length, 3) - 1)}minmax(0, 1fr)` : "minmax(0, 1fr)" }, gap: 1.4, minWidth: 0, overflowX: "hidden", overflowY: "hidden" }}>
  {executions.flatMap((execution, index) => {
    const panel = <Box key={execution.key} data-testid={`${testId}-execution`} sx={{ minWidth: 0 }}>{children(execution)}</Box>;
    return index < executions.length - 1 ? [panel, <Box key={`${execution.key}-divider`} data-testid={dividerTestId || `${testId}-divider`} aria-hidden="true" sx={{ bgcolor: "rgba(83,198,214,0.22)", width: "100%", height: { xs: "1px", md: "100%" } }} />] : [panel];
  })}
</Box>;

const ExecutionLabel = ({ execution }) => <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 0.8, color: execution.color || "text.primary" }}>{execution.displayLabel}</Typography>;

const RankingEvolution = ({ executions }) => <Box sx={cardSx}>
  <Header title="Ranking evolution" subtitle="Position changes across consensus phases." />
  <ExecutionComparisonLayout executions={executions} testId="ranking-evolution-comparison" dividerTestId="ranking-evolution-divider">{(execution) => {
    const visualization = execution.genericAnalysis?.visualizations?.find((entry) => entry?.type === "rankingEvolution");
    return <><ExecutionLabel execution={execution} />{visualization ? <RankingMovementChart movement={buildGenericRankingMovement(visualization)} embedded /> : <Alert severity="info">Ranking evolution is not available for this execution.</Alert>}</>;
  }}</ExecutionComparisonLayout>
</Box>;

const MetricTile = ({ icon, label, value, detail, color = "secondary.main" }) => <Box sx={{ minWidth: 0, p: 1, borderRadius: 2, border: "1px solid", borderColor: `${color}55`, bgcolor: `${color}12` }}>
  <Stack direction="row" spacing={0.6} alignItems="center" sx={{ color }}>{icon}<Typography variant="caption" sx={{ fontWeight: 800 }}>{label}</Typography></Stack>
  <Typography sx={{ mt: 0.35, fontSize: 18, fontWeight: 950, lineHeight: 1.1 }}>{value}</Typography>
  {detail ? <Typography variant="caption" color="text.secondary">{detail}</Typography> : null}
</Box>;

const phaseLabel = (phase) => phase === 0 ? "Initial" : `Round ${phase}`;
const percent = (value) => typeof value === "number" && Number.isFinite(value) ? `${Math.round(value * 100)}%` : null;
const signed = (value) => typeof value === "number" && Number.isFinite(value) ? `${value > 0 ? "+" : ""}${value.toFixed(2)}` : null;

const ProcessOverview = ({ executions }) => {
  const visible = executions.filter((execution) => execution.genericAnalysis?.facts?.processOverview);
  if (!visible.length) return null;
  return <Box sx={cardSx}>
    <Header title="Process overview" subtitle="Key indicators from the completed decision process." />
    <ExecutionComparisonLayout executions={executions} testId="process-overview">{(execution) => {
      const overview = execution.genericAnalysis?.facts?.processOverview;
      if (!overview) return <><ExecutionLabel execution={execution} /><Typography variant="body2" color="text.secondary">Process overview is not available for this execution.</Typography></>;
      const consensus = overview.consensus?.enabled ? overview.consensus : null;
      const stabilization = overview.phaseCount === 1 ? "Single phase" : overview.stabilizationPhase == null ? "Not stabilized" : phaseLabel(overview.stabilizationPhase);
      const participation = overview.participation;
      return <><ExecutionLabel execution={execution} /><Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(116px, 1fr))", gap: 0.8 }}>
        {typeof overview.phaseCount === "number" ? <MetricTile icon={<TimelineRoundedIcon fontSize="small" />} label="Phases" value={overview.phaseCount} /> : null}
        {typeof overview.leaderChangeCount === "number" ? <MetricTile icon={<FlagRoundedIcon fontSize="small" />} label="Leader changes" value={overview.leaderChangeCount} color="warning.main" /> : null}
        <MetricTile icon={<InsightsRoundedIcon fontSize="small" />} label="Ranking stabilized" value={stabilization} color="success.main" />
        {consensus ? <MetricTile icon={<AnalyticsIcon fontSize="small" />} label="Consensus" value={signed(consensus.change) || "—"} detail={consensus.reached ? "Threshold reached" : "Threshold not reached"} /> : null}
        {participation ? <MetricTile icon={<GroupsRoundedIcon fontSize="small" />} label="Participation" value={participation.completedCount != null && participation.totalCount != null ? `${participation.completedCount} / ${participation.totalCount}` : "—"} detail={percent(participation.completionRate)} color="info.main" /> : null}
      </Box></>;
    }}</ExecutionComparisonLayout>
  </Box>;
};

const visualizationFor = (execution, type) => execution.genericAnalysis?.visualizations?.find((entry) => entry?.type === type);
const executionWithVisualization = (executions, type) => executions.some((execution) => visualizationFor(execution, type));

const RankingStabilityChart = ({ visualization }) => {
  const alternatives = Array.isArray(visualization?.alternatives) ? visualization.alternatives : [];
  const maxRank = Math.max(1, ...alternatives.flatMap((entry) => [entry.initialRank, entry.finalRank, entry.bestRank, entry.worstRank]).filter(Number.isFinite));
  const position = (rank) => `${((Math.max(1, rank) - 1) / Math.max(1, maxRank - 1)) * 100}%`;
  return <Box role="img" aria-label="Ranking stability chart" sx={{ display: "grid", gap: 0.75 }}>
    {alternatives.map((alternative, index) => {
      const color = RANKING_ALTERNATIVE_COLORS[index % RANKING_ALTERNATIVE_COLORS.length];
      return <Box key={alternative.alternativeId} aria-label={`${alternative.name}: initial rank ${alternative.initialRank}, final rank ${alternative.finalRank}, best rank ${alternative.bestRank}, worst rank ${alternative.worstRank}, total movement ${alternative.totalMovement}`} sx={{ display: "grid", gridTemplateColumns: "minmax(70px, 0.7fr) minmax(110px, 1.3fr) auto", gap: 0.7, alignItems: "center" }}>
        <Typography noWrap title={alternative.name} variant="caption">{alternative.name}</Typography>
        <Box sx={{ height: 18, position: "relative" }}><Box sx={{ position: "absolute", left: position(alternative.bestRank), right: `${100 - Number.parseFloat(position(alternative.worstRank))}%`, top: 8, height: 3, bgcolor: color, borderRadius: 99 }} /><Box sx={{ position: "absolute", left: position(alternative.initialRank), top: 3, width: 12, height: 12, transform: "translateX(-50%)", borderRadius: "50%", border: `2px solid ${color}`, bgcolor: "background.paper" }} /><Box sx={{ position: "absolute", left: position(alternative.finalRank), top: 4, width: 10, height: 10, transform: "translateX(-50%)", borderRadius: "50%", bgcolor: color }} /></Box>
        <Typography variant="caption" color="text.secondary">movement {alternative.totalMovement}</Typography>
      </Box>;
    })}
    <Typography variant="caption" color="text.secondary">○ Initial &nbsp; ● Final</Typography>
  </Box>;
};

const RankingStability = ({ executions }) => {
  if (!executionWithVisualization(executions, "rankingStability")) return null;
  return <Box sx={cardSx}><Header title="Ranking stability" subtitle="Observed positional range and movement across recorded phases." /><ExecutionComparisonLayout executions={executions} testId="ranking-stability">{(execution) => {
    const visualization = visualizationFor(execution, "rankingStability");
    return <><ExecutionLabel execution={execution} />{visualization ? <RankingStabilityChart visualization={visualization} /> : <Typography variant="body2" color="text.secondary">Ranking stability is not available for this execution.</Typography>}</>;
  }}</ExecutionComparisonLayout></Box>;
};

const RankingAgreementChart = ({ visualization, color }) => {
  const transitions = Array.isArray(visualization?.transitions) ? visualization.transitions.filter((entry) => typeof entry?.coefficient === "number" && Number.isFinite(entry.coefficient)) : [];
  const width = 320; const height = 170; const left = 24; const right = 18; const top = 20; const bottom = 44;
  const x = (index) => transitions.length === 1 ? width / 2 : left + ((width - left - right) * index) / (transitions.length - 1);
  const y = (coefficient) => top + ((1 - coefficient) / 2) * (height - top - bottom);
  const path = transitions.map((entry, index) => `${index ? "L" : "M"} ${x(index)} ${y(entry.coefficient)}`).join(" ");
  return <Box role="img" aria-label="Phase-to-phase ranking agreement chart"><svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: "block" }}>
    <line x1={left} x2={width - right} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.28)" strokeDasharray="4 4" />
    {transitions.length > 1 ? <path d={path} fill="none" stroke={color} strokeWidth="3" /> : null}
    {transitions.map((entry, index) => <g key={`${entry.fromPhase}-${entry.toPhase}`} aria-label={`${phaseLabel(entry.fromPhase)} to ${phaseLabel(entry.toPhase)}: ${entry.coefficient.toFixed(2)}`}><circle cx={x(index)} cy={y(entry.coefficient)} r="5" fill={color} /><text x={x(index)} y={height - 18} textAnchor="middle" fill="rgba(255,255,255,0.72)" fontSize="10">{`${phaseLabel(entry.fromPhase)} → ${phaseLabel(entry.toPhase)}`}</text><text x={x(index)} y={y(entry.coefficient) - 9} textAnchor="middle" fill="rgba(255,255,255,0.86)" fontSize="10">{entry.coefficient.toFixed(2)}</text></g>)}
  </svg>{visualization.stabilizationPhase != null ? <Typography variant="caption" color="text.secondary">Ranking stable from {phaseLabel(visualization.stabilizationPhase)}</Typography> : null}</Box>;
};

const RankingAgreement = ({ executions }) => {
  if (!executionWithVisualization(executions, "rankingAgreement")) return null;
  return <Box sx={cardSx}><Header title="Phase-to-phase ranking agreement" subtitle="Similarity of consecutive rankings across recorded phases." /><ExecutionComparisonLayout executions={executions} testId="ranking-agreement">{(execution) => {
    const visualization = visualizationFor(execution, "rankingAgreement");
    return <><ExecutionLabel execution={execution} />{visualization ? <RankingAgreementChart visualization={visualization} color={execution.color || "#27d5e4"} /> : <Typography variant="body2" color="text.secondary">Ranking agreement is not available for this execution.</Typography>}</>;
  }}</ExecutionComparisonLayout></Box>;
};

const VisualizationsPanel = ({ visualizations = {}, executions = [], scatterPlotRef, onResetZoom }) => {
  const modelVisualizations = visualizations.mode === "comparison"
    ? <ComparisonVisualization comparison={visualizations.expertCollectiveComparison} scatterPlotRef={scatterPlotRef} onResetZoom={onResetZoom} />
    : <SingleVisualization visualizations={visualizations} scatterPlotRef={scatterPlotRef} onResetZoom={onResetZoom} />;
  return <Stack spacing={2}>
    <Box>
      <Typography variant="h5" component="h2" sx={{ mb: 0.4, fontWeight: 900 }}>General visualizations</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>General analytical views of the completed decision process.</Typography>
      <Stack spacing={1.4}>
        <ProcessOverview executions={executions} />
        <RankingEvolution executions={executions} />
        <RankingStability executions={executions} />
        <RankingAgreement executions={executions} />
      </Stack>
      <Box sx={{ mt: 1.4, display: "grid", gridTemplateColumns: visualizations.consensus?.enabled ? { xs: "1fr", lg: "minmax(0, 1.35fr) minmax(300px, 0.85fr)" } : "1fr", gap: 1.4 }}>
        {modelVisualizations}
        {visualizations.consensus?.enabled ? <ConsensusCard consensus={visualizations.consensus} /> : null}
      </Box>
    </Box>
  </Stack>;
};

export default VisualizationsPanel;
