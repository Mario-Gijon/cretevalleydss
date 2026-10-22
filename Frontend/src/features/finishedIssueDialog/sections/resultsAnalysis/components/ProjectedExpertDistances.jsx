import { Box, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";

import { PERFORMANCE_BAR_TOKENS } from "../../../shared/logic/chartVisualTokens.js";
import { buildProjectedExpertDistances } from "../logic/buildProjectedExpertDistances.js";

const barOnlyProps = new Set(["ownerState", "skipAnimation", "id", "dataIndex", "xOrigin", "yOrigin", "color", "layout"]);
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
  const nameCounts = rows.reduce((counts, row) => {
    const label = row.label || row.email || row.identity || "Expert";
    counts.set(label, (counts.get(label) || 0) + 1);
    return counts;
  }, new Map());
  const labels = rows.map((row) => {
    const label = row.label || row.email || row.identity || "Expert";
    const identity = row.email || row.identity;
    return nameCounts.get(label) > 1 && identity && identity !== label
      ? `${label} (${identity})`
      : label;
  });
  const axisLabels = labels.map((label) => truncate(label));
  const allZero = rows.every((row) => row.distance === 0);
  const positiveBelowThreeDecimals = rows.some(
    (row) => row.distance > 0 && row.distance.toFixed(3) === "0.000",
  );
  const distanceMessage = allZero
    ? "The bars have no visible height because every expert-to-collective distance in this stored 2D projection is zero. These projected distances are not direct measures of agreement between experts."
    : positiveBelowThreeDecimals
      ? "Some projected distances are positive but smaller than the usual three-decimal display precision; their labels show additional precision."
      : null;
  const minWidth = Math.max(360, rows.length * 98);
  return <Box sx={{ minWidth: 0 }} data-phase={phase ?? ""}>
    {showLabel ? <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 0.65, color: projection.color }}>{projection.displayLabel}</Typography> : null}
    <Box sx={{ overflowX: "auto", maxWidth: "100%", scrollbarWidth: "thin" }}><Box sx={{ minWidth, height: chartHeight }}>
      <BarChart height={chartHeight} xAxis={[{ scaleType: "band", data: axisLabels }]} series={[{ data: rows.map((row) => row.distance), label: "Projected distance", color: theme.palette.secondary.main, valueFormatter: (value, context) => `${labels[context.dataIndex] || "Expert"}: ${rows[context.dataIndex]?.formattedDistance ?? String(value)}` }]} hideLegend borderRadius={PERFORMANCE_BAR_TOKENS.radius} barLabel={(item) => Number.isFinite(item.value) ? rows[item.dataIndex]?.formattedDistance ?? String(item.value) : null} axisHighlight={{ x: "none", y: "none" }} grid={{ horizontal: true }} margin={{ top: 28, right: 20, bottom: 58, left: 62 }} slots={{ bar: (props) => <DistanceBar {...props} rows={rows} /> }} slotProps={{ barLabel: { style: { fill: theme.palette.text.primary, fontSize: 11, fontWeight: 700 } } }} />
    </Box></Box>
    {distanceMessage ? <Typography variant="caption" color="text.secondary" data-testid="projected-distance-interpretation">{distanceMessage}</Typography> : null}
  </Box>;
};

export default ProjectedExpertDistances;
