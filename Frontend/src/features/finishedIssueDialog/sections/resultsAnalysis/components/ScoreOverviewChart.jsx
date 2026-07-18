import { Box, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import { BarChart } from "@mui/x-charts/BarChart";

import { getScoreOverviewChartHeight } from "../logic/scoreOverviewChartHeight.js";
import { buildScoreOverviewSeries, formatOriginalScore } from "../logic/buildScoreOverviewSeries.js";
import { scoreChartContainerSx, scoreChartViewportSx, scoreOverviewPanelSx } from "../resultsAnalysis.styles.js";
import { PERFORMANCE_BAR_TOKENS, performanceBarBorderFor } from "../../../shared/logic/chartVisualTokens.js";

const barOnlyProps = new Set(["ownerState", "skipAnimation", "id", "dataIndex", "xOrigin", "yOrigin", "color", "layout"]);

const ScoreOverviewBar = (props) => {
  const rectProps = Object.fromEntries(Object.entries(props).filter(([key]) => !barOnlyProps.has(key)));
  return <rect {...rectProps} stroke={performanceBarBorderFor(props.color)} strokeWidth={1.25} />;
};

const ScoreOverviewChart = ({ ranking }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("xl"));
  const chartEntries = ranking;
  const series = buildScoreOverviewSeries(chartEntries);
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
                ...series,
              ]}
              hideLegend
              borderRadius={PERFORMANCE_BAR_TOKENS.radius}
              barLabel={(item) => typeof item.value === "number" && Number.isFinite(item.value) ? formatOriginalScore(item.value) : null}
              axisHighlight={{ x: "none", y: "none" }}
              slots={{ bar: ScoreOverviewBar }}
              slotProps={{ tooltip: { trigger: "none" }, barLabel: { style: { fill: theme.palette.text.primary, fontSize: 11, fontWeight: 700 } } }}
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
