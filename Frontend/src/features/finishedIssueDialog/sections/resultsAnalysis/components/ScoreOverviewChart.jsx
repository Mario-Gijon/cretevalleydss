import { Box, Stack, ToggleButton, Typography, useMediaQuery, useTheme } from "@mui/material";
import { useState } from "react";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import { BarChart } from "@mui/x-charts/BarChart";

import { getScoreOverviewChartHeight } from "../logic/scoreOverviewChartHeight.js";
import { buildScoreOverviewSeries, formatOriginalScore } from "../logic/buildScoreOverviewSeries.js";
import { normalizeRankingScores } from "../logic/normalizeRankingScores.js";
import { scoreChartContainerSx, scoreChartViewportSx, scoreOverviewPanelSx } from "../resultsAnalysis.styles.js";
import { PERFORMANCE_BAR_TOKENS, performanceBarBorderFor } from "../../../shared/logic/chartVisualTokens.js";

const barOnlyProps = new Set(["ownerState", "skipAnimation", "id", "dataIndex", "xOrigin", "yOrigin", "color", "layout"]);

const ScoreOverviewBar = (props) => {
  const rectProps = Object.fromEntries(Object.entries(props).filter(([key]) => !barOnlyProps.has(key)));
  return <rect {...rectProps} stroke={performanceBarBorderFor(props.color)} strokeWidth={1.25} />;
};

const ScoreOverviewChart = ({ ranking }) => {
  const [normalizationEnabled, setNormalizationEnabled] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("xl"));
  const chartEntries = normalizationEnabled ? normalizeRankingScores(ranking) : ranking;
  const series = buildScoreOverviewSeries(chartEntries);
  const minWidth = chartEntries.length * 90;
  const chartHeight = getScoreOverviewChartHeight({ isMobile, isDesktop });

  return (
    <Box sx={scoreOverviewPanelSx}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
        <Stack direction="row" spacing={1} alignItems="center">
          <BarChartRoundedIcon sx={{ color: "secondary.light" }} />
          <Box>
            <Typography component="h2" sx={{ fontSize: 18, fontWeight: 950 }}>
              Score overview
            </Typography>
            <Typography sx={{ color: "text.secondary", fontSize: 11.5 }}>
              Scores by alternative for this execution.
            </Typography>
          </Box>
        </Stack>
        <ToggleButton value="normalize-values" size="small" color="secondary" selected={normalizationEnabled} onChange={() => setNormalizationEnabled((enabled) => !enabled)} aria-label="Normalize values">Normalize values</ToggleButton>
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
        {normalizationEnabled ? "Scores are normalized from 0 to 1 within this execution." : "Scores are shown in the original scale of this execution."}
      </Typography>
    </Box>
  );
};

export default ScoreOverviewChart;
