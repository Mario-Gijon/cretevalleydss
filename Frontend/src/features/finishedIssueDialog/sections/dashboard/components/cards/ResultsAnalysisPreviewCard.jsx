import { Box, Chip, Stack, Typography } from "@mui/material";
import InsightsIcon from "@mui/icons-material/Insights";

import DashboardCardShell, { MetaText } from "../DashboardCardShell";
import { AnalyticalScatterChart } from "../../../../graphs/components/AnalyticalScatterChart";
import { dashboardGraphPreviewSx } from "../../dashboard.styles";

const ResultsAnalysisPreviewCard = ({ resultsAnalysis, onViewResultsAnalysis }) => (
  <DashboardCardShell title="Results analysis" icon={<InsightsIcon fontSize="small" />} actionLabel="View results analysis" onAction={onViewResultsAnalysis}>
    <Stack spacing={0.5}>
      <MetaText>{resultsAnalysis.context.executionLabel} · {resultsAnalysis.context.phaseLabel}</MetaText>
      {resultsAnalysis.outcome.available ? resultsAnalysis.outcome.topRanking.map((item) => <Stack key={item.id} direction="row" justifyContent="space-between" spacing={1}><Typography variant="body2" noWrap sx={{ minWidth: 0 }}>{item.position}. {item.name}</Typography>{item.score !== undefined ? <Chip size="small" label={item.formattedScore} variant="outlined" /> : null}</Stack>) : <Typography variant="body2" color="text.secondary">No ranking output is available for this execution.</Typography>}
      {resultsAnalysis.visualizations.hasPerformanceMap ? <Box sx={dashboardGraphPreviewSx}><AnalyticalScatterChart data={resultsAnalysis.visualizations.performanceMapData} phase={resultsAnalysis.visualizations.performanceMapData.length === 1 ? 0 : resultsAnalysis.visualizations.selectedPhaseIndex} compact /></Box> : null}
      {!resultsAnalysis.interpretation.available ? <MetaText>Results interpretation is not available yet.</MetaText> : null}
    </Stack>
  </DashboardCardShell>
);

export default ResultsAnalysisPreviewCard;
