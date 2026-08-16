import { Box, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";

import { PERFORMANCE_BAR_TOKENS } from "../../../shared/logic/chartVisualTokens.js";
import { buildProjectedExpertDistances } from "../logic/buildProjectedExpertDistances.js";

const barOnlyProps = new Set(["ownerState", "skipAnimation", "id", "dataIndex", "xOrigin", "yOrigin", "color", "layout"]);
const axisLabel = (row) => row.email || row.label || row.identity || "Expert";
const truncate = (value, length = 18) => value.length > length ? `${value.slice(0, length - 1)}…` : value;

const DistanceBar = ({ rows, ...props }) => {
  const rectProps = Object.fromEntries(Object.entries(props).filter(([key]) => !barOnlyProps.has(key)));
  const closest = rows[props.dataIndex]?.closest;
  return <rect {...rectProps} fill={closest ? "rgba(58, 157, 206, 0.92)" : PERFORMANCE_BAR_TOKENS.standardFill} stroke={closest ? "rgba(119, 207, 231, 0.96)" : PERFORMANCE_BAR_TOKENS.standardBorder} strokeWidth={closest ? 1.5 : 1.15} rx={PERFORMANCE_BAR_TOKENS.radius} />;
};

const ProjectedExpertDistances = ({ projections = [], phase = null, matchScatterHeight = false }) => {
  const theme = useTheme();
  const isXl = useMediaQuery(theme.breakpoints.up("xl"));
  const isMd = useMediaQuery(theme.breakpoints.up("md"));
  const isSm = useMediaQuery(theme.breakpoints.up("sm"));
  const chartHeight = isXl
    ? 430
    : isMd
      ? 420
      : isSm
        ? 360
        : 320;
  const available = projections.map((projection) => ({ projection, rows: buildProjectedExpertDistances(projection) })).filter(({ rows }) => rows.length);
  if (!available.length) return <Typography variant="body2" color="text.secondary">No stored expert–collective analytical projection is available for the selected executions.</Typography>;
  return <Stack spacing={1.4}>{available.map(({ projection, rows }) => <DistanceChart key={projection.key} projection={projection} rows={rows} phase={phase} chartHeight={matchScatterHeight ? chartHeight : 250} showLabel={available.length > 1} />)}</Stack>;
};

const DistanceChart = ({ projection, rows, phase, showLabel, chartHeight }) => {
  const theme = useTheme();
  const labels = rows.map(axisLabel);
  const axisLabels = labels.map((label) => truncate(label));
  const minWidth = Math.max(360, rows.length * 98);
  return <Box sx={{ minWidth: 0 }} data-phase={phase ?? ""}>
    {showLabel ? <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 0.65, color: projection.color }}>{projection.displayLabel}</Typography> : null}
    <Box sx={{ overflowX: "auto", maxWidth: "100%", scrollbarWidth: "thin" }}><Box sx={{ minWidth, height: chartHeight }}>
      <BarChart height={chartHeight} xAxis={[{ scaleType: "band", data: axisLabels }]} series={[{ data: rows.map((row) => row.distance), label: "Projected distance", color: theme.palette.secondary.main, valueFormatter: (value, context) => `${labels[context.dataIndex] || "Expert"}: ${Number(value).toFixed(3)}` }]} hideLegend borderRadius={PERFORMANCE_BAR_TOKENS.radius} barLabel={(item) => Number.isFinite(item.value) ? item.value.toFixed(3) : null} axisHighlight={{ x: "none", y: "none" }} grid={{ horizontal: true }} margin={{ top: 28, right: 20, bottom: 58, left: 62 }} slots={{ bar: (props) => <DistanceBar {...props} rows={rows} /> }} slotProps={{ barLabel: { style: { fill: theme.palette.text.primary, fontSize: 11, fontWeight: 700 } } }} />
    </Box></Box>
  </Box>;
};

export default ProjectedExpertDistances;
