import { Box, Stack, Typography } from "@mui/material";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import { BarChart } from "@mui/x-charts/BarChart";

import { scoreChartContainerSx, scoreChartViewportSx, scoreOverviewPanelSx } from "../resultsAnalysis.styles.js";

const ScoreOverviewChart = ({ ranking }) => {
  const chartEntries = ranking;
  const minWidth = Math.max(620, chartEntries.length * 90);
  return <Box sx={scoreOverviewPanelSx}>
    <Stack direction="row" spacing={1} alignItems="center"><BarChartRoundedIcon sx={{ color: "secondary.light" }} /><Box><Typography component="h2" sx={{ fontSize: 18, fontWeight: 950 }}>Score overview</Typography><Typography sx={{ color: "text.secondary", fontSize: 11.5 }}>Original scores by alternative for this execution.</Typography></Box></Stack>
    {chartEntries.length ? <Box sx={scoreChartViewportSx}><Box sx={scoreChartContainerSx(minWidth)}><BarChart xAxis={[{ scaleType: "band", data: chartEntries.map((entry) => entry.name) }]} series={[{ data: chartEntries.map((entry) => entry.score), label: "Score (original)", valueFormatter: (value) => typeof value === "number" ? Number(value.toFixed(4)).toString() : "—" }]} grid={{ horizontal: true }} margin={{ top: 35, right: 25, bottom: 55, left: 70 }} /></Box></Box> : <Typography sx={{ mt: 2, color: "text.secondary", fontSize: 12 }}>No alternatives are available for this execution.</Typography>}
    <Typography sx={{ mt: 0.8, color: "text.secondary", fontSize: 10.8 }}>Scores are shown in the original scale of this execution.</Typography>
  </Box>;
};

export default ScoreOverviewChart;
