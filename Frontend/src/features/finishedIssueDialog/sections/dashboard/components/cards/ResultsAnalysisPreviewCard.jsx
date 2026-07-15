import { Box, Chip, Stack, Typography } from "@mui/material";
import InsightsIcon from "@mui/icons-material/Insights";

import DashboardCardShell, { MetaText } from "../DashboardCardShell";
import RankingMiniChart from "../RankingMiniChart";

const ResultsAnalysisPreviewCard = ({ resultsAnalysis, onViewResultsAnalysis }) => (
  <DashboardCardShell number="2" title="Results analysis" subtitle={resultsAnalysis.context.executionLabel} icon={<InsightsIcon fontSize="small" />} actionLabel="View results analysis" onAction={onViewResultsAnalysis} accent="gold">
    <Stack spacing={0.7}>
      <MetaText>{resultsAnalysis.context.executionLabel} · {resultsAnalysis.context.phaseLabel}</MetaText>
      {resultsAnalysis.outcome.available ? <>
        {resultsAnalysis.outcome.topRanking.map((item) => <Stack key={item.id} direction="row" justifyContent="space-between" alignItems="center" spacing={1}><Stack direction="row" spacing={0.65} alignItems="center" sx={{ minWidth: 0 }}><Box sx={{ width: 22, height: 22, display: "grid", placeItems: "center", borderRadius: 1, fontSize: 11, fontWeight: 950, bgcolor: item.position === 1 ? "rgba(235, 191, 74, 0.22)" : item.position === 2 ? "rgba(206, 214, 221, 0.16)" : "rgba(208, 129, 69, 0.18)", color: item.position === 1 ? "#f0c65a" : item.position === 2 ? "#dce5eb" : "#dd9761" }}>{item.position}</Box><Typography variant="body2" noWrap sx={{ minWidth: 0, fontWeight: item.position === 1 ? 900 : 750 }}>{item.name}</Typography></Stack><Chip size="small" label={item.formattedScore} variant="outlined" /></Stack>)}
        <RankingMiniChart ranking={resultsAnalysis.outcome.topRanking} />
        {resultsAnalysis.outcome.winner ? <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 750 }}>{resultsAnalysis.outcome.winner.name} is ranked first with a score of {resultsAnalysis.outcome.winner.formattedScore}.</Typography> : null}
      </> : <Typography variant="body2" color="text.secondary">{resultsAnalysis.outcome.unavailableReason || "No ranking output is available for this execution."}</Typography>}
      {!resultsAnalysis.interpretation.available ? <MetaText>Results interpretation is not available yet.</MetaText> : null}
    </Stack>
  </DashboardCardShell>
);

export default ResultsAnalysisPreviewCard;
