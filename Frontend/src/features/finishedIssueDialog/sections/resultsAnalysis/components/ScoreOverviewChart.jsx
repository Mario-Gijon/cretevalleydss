import { Box, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import { BarChart } from "@mui/x-charts/BarChart";

import { getScoreOverviewChartHeight } from "../logic/scoreOverviewChartHeight.js";
import { scoreChartContainerSx, scoreChartViewportSx, scoreOverviewPanelSx } from "../resultsAnalysis.styles.js";

const ScoreOverviewChart = ({ ranking }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("xl"));
  const chartEntries = ranking;
  const minWidth = Math.max(620, chartEntries.length * 90);
  const chartHeight = getScoreOverviewChartHeight({ isMobile, isDesktop });

  return (
    <Box sx={scoreOverviewPanelSx}>
      <Stack direction="row" spacing={1} alignItems="center">
        <BarChartRoundedIcon sx={{ color: "secondary.light" }} />
        <Box>
          <Typography component="h2" sx={{ fontSize: 18, fontWeight: 950 }}>
            Score overview
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: 11.5 }}>
            Original scores by alternative for this execution.
          </Typography>
        </Box>
      </Stack>

      {chartEntries.length ? (
        <Box sx={scoreChartViewportSx}>
          <Box sx={scoreChartContainerSx(minWidth, chartHeight)}>
            <BarChart
              height={chartHeight}
              xAxis={[
                {
                  scaleType: "band",
                  data: chartEntries.map((entry) => entry.name),
                },
              ]}
              series={[
                {
                  data: chartEntries.map((entry) => entry.score),
                  label: "Score (original)",
                  valueFormatter: (value) =>
                    typeof value === "number"
                      ? Number(value.toFixed(4)).toString()
                      : "—",
                },
              ]}
              grid={{ horizontal: true }}
              margin={{ top: 30, right: 20, bottom: 48, left: 58 }}
            />
          </Box>
        </Box>
      ) : (
        <Typography sx={{ mt: 2, color: "text.secondary", fontSize: 12 }}>
          No alternatives are available for this execution.
        </Typography>
      )}

      <Typography sx={{ mt: 0.8, color: "text.secondary", fontSize: 10.8 }}>
        Scores are shown in the original scale of this execution.
      </Typography>
    </Box>
  );
};

export default ScoreOverviewChart;
