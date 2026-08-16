import { Box, Tooltip, Typography } from "@mui/material";

import GraphUnavailable from "./GraphUnavailable.jsx";

const colorFor = (value, minimum, maximum) => {
  const ratio = maximum === minimum ? 0.5 : (value - minimum) / (maximum - minimum);
  return `rgba(83, 198, 214, ${0.15 + Math.max(0, Math.min(1, ratio)) * 0.7})`;
};

const HeatmapAnalyticalGraph = ({ visualization }) => {
  const data = visualization?.data;
  if (!Array.isArray(data?.rows) || !Array.isArray(data?.columns) || !Array.isArray(data?.values)) return <GraphUnavailable />;
  const finiteValues = data.values.flat().filter(Number.isFinite);
  const minimum = Math.min(...finiteValues);
  const maximum = Math.max(...finiteValues);
  return <Box data-testid="heatmap-analytical-graph" sx={{ display: "grid", gridTemplateColumns: `minmax(90px, auto) repeat(${data.columns.length}, minmax(64px, 1fr))`, gap: 0.5, overflowX: "auto" }}>
    <Box />
    {data.columns.map((column) => <Typography key={column.key} variant="caption" sx={{ textAlign: "center", fontWeight: 700 }}>{column.label || column.key}</Typography>)}
    {data.rows.map((row, rowIndex) => <Box key={row.key} sx={{ display: "contents" }}>
      <Typography variant="caption" sx={{ alignSelf: "center", fontWeight: 700 }}>{row.label || row.key}</Typography>
      {data.columns.map((column, columnIndex) => {
        const value = data.values[rowIndex]?.[columnIndex];
        const label = `${row.label || row.key}, ${column.label || column.key}: ${Number.isFinite(value) ? value : "Unavailable"}`;
        return <Tooltip key={column.key} title={label}><Box aria-label={label} sx={{ minHeight: 42, display: "grid", placeItems: "center", borderRadius: 1, bgcolor: Number.isFinite(value) ? colorFor(value, minimum, maximum) : "action.disabledBackground" }}>{Number.isFinite(value) ? value : "—"}</Box></Tooltip>;
      })}
    </Box>)}
  </Box>;
};

export default HeatmapAnalyticalGraph;
