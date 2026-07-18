import { Box, Stack, Typography } from "@mui/material";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";

import DashboardInnerPanel from "../DashboardInnerPanel";
import DashboardPreviewCard from "../DashboardPreviewCard";
import ResultsRankingBarChart from "../charts/ResultsRankingBarChart";
import { dashboardResultsUpperGridSx } from "../../dashboard.styles";

const scoreText = (item) => typeof item?.formattedScore === "string" && item.formattedScore ? item.formattedScore : "—";

const positionStyle = (position) => ({
  bgcolor: position === 1 ? "rgba(63, 193, 139, 0.13)" : position === 2 ? "rgba(54, 190, 203, 0.12)" : "rgba(52, 139, 218, 0.12)",
  color: position === 1 ? "success.light" : position === 2 ? "secondary.light" : "#8fc7ff",
  border: position === 1 ? "1px solid rgba(63, 193, 139, 0.34)" : position === 2 ? "1px solid rgba(54, 190, 203, 0.30)" : "1px solid rgba(52, 139, 218, 0.30)",
});

const ResultsAnalysisPreviewCard = ({ resultsAnalysis, onViewResultsAnalysis }) => {
  const ranking = resultsAnalysis.outcome?.topRanking || [];
  const winner = resultsAnalysis.outcome?.winner || ranking[0] || null;
  const rankingHeading = resultsAnalysis.rankingTitle || "Ranking";
  const performanceHeading = resultsAnalysis.performanceTitle || "Performance overview";
  return <DashboardPreviewCard icon={<InsightsRoundedIcon fontSize="small" />} title="Results analysis" actionLabel="View results analysis" onAction={onViewResultsAnalysis}>
    {resultsAnalysis.outcome.available ? <Stack spacing={0.65}>
      <Box sx={dashboardResultsUpperGridSx}>
        <DashboardInnerPanel>
          <Typography variant="subtitle2" sx={{ mb: 0.9 }}>{rankingHeading}</Typography>
          <Stack spacing={0.55}>{ranking.map((item) => <Stack key={item.id} direction="row" alignItems="center" spacing={0.7}>
            <Box sx={{ ...positionStyle(item.position), width: 26, height: 26, display: "grid", placeItems: "center", flexShrink: 0, borderRadius: "50%", typography: "caption", fontWeight: "fontWeightBold" }}>{item.position}</Box>
            <Typography variant="body2" noWrap title={item.name} sx={{ minWidth: 0, flex: 1, fontWeight: item.position === 1 ? "fontWeightBold" : "fontWeightMedium" }}>{item.name}</Typography>
            <Typography variant="body2" sx={{ color: item.position === 1 ? "success.light" : "secondary.light", fontWeight: "fontWeightBold", fontVariantNumeric: "tabular-nums" }}>{scoreText(item)}</Typography>
          </Stack>)}</Stack>
        </DashboardInnerPanel>
        <DashboardInnerPanel><Typography variant="subtitle2" sx={{ mb: 0.35 }}>{performanceHeading}</Typography><ResultsRankingBarChart ranking={ranking} /></DashboardInnerPanel>
      </Box>
      {winner ? <DashboardInnerPanel><Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 38, height: 38, display: "grid", placeItems: "center", flexShrink: 0, borderRadius: "50%", color: "secondary.light", bgcolor: "rgba(48, 153, 198, 0.13)" }}><AutoGraphRoundedIcon fontSize="small" /></Box><Typography variant="body2" sx={{ color: "text.secondary" }}><Box component="span" sx={{ color: "text.primary", fontWeight: "fontWeightBold" }}>{winner.name}</Box> is ranked first with a score of <Box component="span" sx={{ color: "success.light", fontWeight: "fontWeightBold" }}>{scoreText(winner)}</Box>.</Typography></Stack></DashboardInnerPanel> : null}
      <Stack direction="row" spacing={0.7} alignItems="center"><InfoOutlinedIcon sx={{ color: "secondary.light", fontSize: 17 }} /><Typography variant="caption" sx={{ color: "text.secondary" }}>Interpretation is not available yet.</Typography></Stack>
    </Stack> : <DashboardInnerPanel><Typography variant="body2" color="text.secondary">{resultsAnalysis.outcome.unavailableReason || "No ranking output is available for this execution."}</Typography></DashboardInnerPanel>}
  </DashboardPreviewCard>;
};

export default ResultsAnalysisPreviewCard;
