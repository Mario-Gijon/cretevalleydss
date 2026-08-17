import { Box, Tooltip, Typography } from "@mui/material";

import GraphUnavailable from "./GraphUnavailable.jsx";

const colorFor = (value, minimum, maximum) => {
  const ratio = maximum === minimum ? 0.5 : (value - minimum) / (maximum - minimum);
  return `rgba(83, 198, 214, ${0.15 + Math.max(0, Math.min(1, ratio)) * 0.7})`;
};

const neutralColor = "rgba(255, 255, 255, 0.12)";
const divergingColorFor = (value, center, magnitude) => {
  const difference = value - center;
  if (!Number.isFinite(difference) || !Number.isFinite(magnitude) || magnitude <= 0 || Math.abs(difference) <= Number.EPSILON * Math.max(1, magnitude)) return neutralColor;
  const intensity = Math.max(0, Math.min(1, Math.abs(difference) / magnitude));
  const opacity = Number((0.18 + intensity * 0.67).toFixed(3));
  return difference < 0
    ? `rgba(232, 137, 181, ${opacity})`
    : `rgba(83, 198, 214, ${opacity})`;
};

const humanizeKey = (key) => String(key).replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, (character) => character.toUpperCase());
const formatValue = (value) => typeof value === "number" && Number.isFinite(value) ? Number(value.toPrecision(8)).toString() : String(value);

export const heatmapTooltipLines = ({ row, column, value, details }) => {
  const lines = [`${row.label || row.key}, ${column.label || column.key}: ${Number.isFinite(value) ? formatValue(value) : "Unavailable"}`];
  if (!details || typeof details !== "object" || Array.isArray(details)) return lines;
  Object.entries(details).forEach(([key, detail]) => {
    if (["string", "boolean"].includes(typeof detail) || (typeof detail === "number" && Number.isFinite(detail))) lines.push(`${humanizeKey(key)}: ${formatValue(detail)}`);
  });
  return lines;
};

const HeatmapAnalyticalGraph = ({ visualization }) => {
  const data = visualization?.data;
  if (!Array.isArray(data?.rows) || !Array.isArray(data?.columns) || !Array.isArray(data?.values)) return <GraphUnavailable />;
  const finiteValues = data.values.flat().filter(Number.isFinite);
  const minimum = Math.min(...finiteValues);
  const maximum = Math.max(...finiteValues);
  const diverging = visualization?.scale?.kind === "diverging";
  const center = Number.isFinite(visualization?.scale?.center) ? visualization.scale.center : 0;
  const magnitude = finiteValues.reduce((maximumDeviation, value) => Math.max(maximumDeviation, Math.abs(value - center)), 0);
  return <Box data-testid="heatmap-analytical-graph" sx={{ display: "grid", gridTemplateColumns: `minmax(90px, auto) repeat(${data.columns.length}, minmax(64px, 1fr))`, gap: 0.5, overflowX: "auto" }}>
    <Box />
    {data.columns.map((column) => <Typography key={column.key} variant="caption" sx={{ textAlign: "center", fontWeight: 700 }}>{column.label || column.key}</Typography>)}
    {data.rows.map((row, rowIndex) => <Box key={row.key} sx={{ display: "contents" }}>
      <Typography variant="caption" sx={{ alignSelf: "center", fontWeight: 700 }}>{row.label || row.key}</Typography>
      {data.columns.map((column, columnIndex) => {
        const value = data.values[rowIndex]?.[columnIndex];
        const lines = heatmapTooltipLines({ row, column, value, details: data.details?.[rowIndex]?.[columnIndex] });
        const label = lines.join("\n");
        const color = Number.isFinite(value) ? (diverging ? divergingColorFor(value, center, magnitude) : colorFor(value, minimum, maximum)) : "action.disabledBackground";
        return <Tooltip key={column.key} title={label}><Box aria-label={label} data-color-scale={diverging ? "diverging" : "sequential"} data-cell-color={color} sx={{ minHeight: 42, display: "grid", placeItems: "center", borderRadius: 1, bgcolor: color, color: "rgba(255,255,255,0.94)", fontWeight: 700 }}>{Number.isFinite(value) ? formatValue(value) : "—"}</Box></Tooltip>;
      })}
    </Box>)}
  </Box>;
};

export default HeatmapAnalyticalGraph;
