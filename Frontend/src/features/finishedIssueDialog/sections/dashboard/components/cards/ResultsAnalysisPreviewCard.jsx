import { Box, Stack, Typography } from "@mui/material";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import DashboardInnerPanel from "../DashboardInnerPanel";
import DashboardPreviewCard from "../DashboardPreviewCard";
import ResultsRankingBarChart from "../charts/ResultsRankingBarChart";
import { dashboardResultsUpperGridSx } from "../../dashboard.styles";

const scoreText = (item) => typeof item?.formattedScore === "string" && item.formattedScore ? item.formattedScore : "—";

const positionStyle = (position) => ({
  bgcolor: position === 1 ? "rgba(231, 188, 54, 0.14)" : position === 2 ? "rgba(192, 204, 214, 0.11)" : "rgba(207, 123, 64, 0.12)",
  color: position === 1 ? "#e7bc36" : position === 2 ? "#d4dde4" : "#de8b55",
  border: position === 1 ? "1px solid rgba(231,188,54,0.42)" : position === 2 ? "1px solid rgba(192,204,214,0.30)" : "1px solid rgba(222,139,85,0.34)",
});

const ResultsAnalysisPreviewCard = ({ resultsAnalysis, onViewResultsAnalysis }) => {
  const ranking = resultsAnalysis.outcome?.topRanking || [];
  const winner = resultsAnalysis.outcome?.winner || ranking[0] || null;
  return <DashboardPreviewCard number="2" title="Results analysis" subtitle={`${resultsAnalysis.context.executionLabel || "—"} · ${resultsAnalysis.context.phaseLabel || "—"}`} actionLabel="View results analysis" onAction={onViewResultsAnalysis} accent="gold">
    {resultsAnalysis.outcome.available ? <Stack spacing={1}>
      <Box sx={dashboardResultsUpperGridSx}>
        <DashboardInnerPanel>
          <Typography sx={{ fontSize: 13, fontWeight: 900, mb: 0.9 }}>Top 3 ranking</Typography>
          <Stack spacing={0.75}>{ranking.map((item) => <Stack key={item.id} direction="row" alignItems="center" spacing={0.8}>
            <Box sx={{ ...positionStyle(item.position), width: 26, height: 26, display: "grid", placeItems: "center", flexShrink: 0, borderRadius: "50%", fontSize: 12, fontWeight: 950 }}>{item.position}</Box>
            <Typography noWrap title={item.name} sx={{ minWidth: 0, flex: 1, fontSize: 13.5, fontWeight: item.position === 1 ? 950 : 750 }}>{item.name}</Typography>
            <Typography sx={{ color: item.position === 1 ? "success.light" : "secondary.light", fontSize: 12.5, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{scoreText(item)}</Typography>
          </Stack>)}</Stack>
        </DashboardInnerPanel>
        <DashboardInnerPanel><Typography sx={{ fontSize: 13, fontWeight: 900, mb: 0.35 }}>Performance overview</Typography><ResultsRankingBarChart ranking={ranking} /></DashboardInnerPanel>
      </Box>
      {winner ? <DashboardInnerPanel><Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 38, height: 38, display: "grid", placeItems: "center", flexShrink: 0, borderRadius: "50%", color: "secondary.light", bgcolor: "rgba(48, 153, 198, 0.13)" }}><AutoGraphRoundedIcon fontSize="small" /></Box><Typography sx={{ color: "text.secondary", fontSize: 13, lineHeight: 1.5, fontWeight: 650 }}><Box component="span" sx={{ color: "text.primary", fontWeight: 900 }}>{winner.name}</Box> is ranked first with a score of <Box component="span" sx={{ color: "success.light", fontWeight: 900 }}>{scoreText(winner)}</Box>.</Typography></Stack></DashboardInnerPanel> : null}
      <Stack direction="row" spacing={0.7} alignItems="center"><InfoOutlinedIcon sx={{ color: "secondary.light", fontSize: 17 }} /><Typography sx={{ color: "text.secondary", fontSize: 12, fontWeight: 650 }}>Interpretation is not available yet.</Typography></Stack>
    </Stack> : <DashboardInnerPanel><Typography color="text.secondary" sx={{ fontSize: 13 }}>{resultsAnalysis.outcome.unavailableReason || "No ranking output is available for this execution."}</Typography></DashboardInnerPanel>}
  </DashboardPreviewCard>;
};

export default ResultsAnalysisPreviewCard;
