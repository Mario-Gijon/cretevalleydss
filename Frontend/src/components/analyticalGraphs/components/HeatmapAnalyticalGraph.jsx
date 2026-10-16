import { Box, Tooltip, Typography } from "@mui/material";

import GraphUnavailable from "./GraphUnavailable.jsx";

const colorFor = (value, minimum, maximum) => {
  const ratio = maximum === minimum ? 0.5 : (value - minimum) / (maximum - minimum);
  return `rgba(83, 198, 214, ${0.15 + Math.max(0, Math.min(1, ratio)) * 0.7})`;
};

const neutralColor = "rgba(255, 255, 255, 0.12)";
const TWO_TUPLE_HEATMAP_KEYS = new Set([
  "two-tuple-collective-profile",
  "two-tuple-alpha-heatmap",
  "collective-beta-heatmap",
  "alpha-heatmap",
]);
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
const formatValue = (value, precision = 8) => typeof value === "number" && Number.isFinite(value) ? Number(value.toPrecision(precision)).toString() : String(value);
const valuePrecision = (value) => Number.isInteger(value) && value >= 1 && value <= 15 ? value : 8;

export const heatmapTooltipLines = ({ row, column, value, details }) => {
  const precision = valuePrecision(details?.valuePrecision);
  const note = typeof details?.note === "string" ? details.note : null;
  const cellValue = Number.isFinite(value) ? formatValue(value, precision) : note || "Unavailable";
  const lines = [`${row.label || row.key}, ${column.label || column.key}: ${cellValue}`];
  if (!details || typeof details !== "object" || Array.isArray(details)) return lines;
  Object.entries(details).forEach(([key, detail]) => {
    if (key === "note" || key === "valuePrecision") return;
    if (["string", "boolean"].includes(typeof detail) || (typeof detail === "number" && Number.isFinite(detail))) lines.push(`${humanizeKey(key)}: ${formatValue(detail)}`);
  });
  return lines;
};

const HeatmapAnalyticalGraph = ({ visualization }) => {
  const data = visualization?.data;
  if (!Array.isArray(data?.rows) || !Array.isArray(data?.columns) || !Array.isArray(data?.values)) return <GraphUnavailable />;
  const finiteValues = data.values.flat().filter(Number.isFinite);
  const minimum = Number.isFinite(visualization?.scale?.min) ? visualization.scale.min : Math.min(...finiteValues);
  const maximum = Number.isFinite(visualization?.scale?.max) ? visualization.scale.max : Math.max(...finiteValues);
  const diverging = visualization?.scale?.kind === "diverging";
  const truncateLabels = visualization?.truncateLabels === true;
  const mccAdjustmentMap = visualization?.key === "mcc-adjustment-map";
  const twoTupleHeatmap = TWO_TUPLE_HEATMAP_KEYS.has(visualization?.key);
  const showColumnTooltips = truncateLabels || mccAdjustmentMap || twoTupleHeatmap;
  const labelColumn = mccAdjustmentMap
    ? "minmax(180px, 240px)"
    : twoTupleHeatmap
      ? "240px"
      : truncateLabels
        ? "minmax(90px, 220px)"
        : "minmax(90px, auto)";
  const criterionColumnMinWidth = mccAdjustmentMap || twoTupleHeatmap ? 150 : 64;
  const precision = valuePrecision(visualization?.scale?.valuePrecision);
  const center = Number.isFinite(visualization?.scale?.center) ? visualization.scale.center : 0;
  const magnitude = finiteValues.reduce((maximumDeviation, value) => Math.max(maximumDeviation, Math.abs(value - center)), 0);
  return <Box data-testid="heatmap-analytical-graph" sx={{ display: "grid", width: truncateLabels || mccAdjustmentMap || twoTupleHeatmap ? "100%" : undefined, gridTemplateColumns: `${labelColumn} repeat(${data.columns.length}, minmax(${criterionColumnMinWidth}px, 1fr))`, gap: 0.5 }}>
    <Box />
    {data.columns.map((column) => <Typography key={column.key} variant="caption" noWrap={showColumnTooltips && !twoTupleHeatmap} title={showColumnTooltips ? column.label || column.key : undefined} sx={{ textAlign: "center", fontWeight: 700, ...(showColumnTooltips ? { minWidth: 0 } : {}), ...(twoTupleHeatmap ? { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden", overflowWrap: "anywhere", lineHeight: 1.25 } : {}) }}>{column.label || column.key}</Typography>)}
    {data.rows.map((row, rowIndex) => <Box key={row.key} sx={{ display: "contents" }}>
      <Typography variant="caption" noWrap={truncateLabels || twoTupleHeatmap} title={truncateLabels || mccAdjustmentMap || twoTupleHeatmap ? row.label || row.key : undefined} sx={{ alignSelf: "center", fontWeight: 700, ...(truncateLabels || mccAdjustmentMap || twoTupleHeatmap ? { minWidth: 0 } : {}), ...(mccAdjustmentMap ? { overflowWrap: "anywhere" } : {}) }}>{row.label || row.key}</Typography>
      {data.columns.map((column, columnIndex) => {
        const value = data.values[rowIndex]?.[columnIndex];
        const details = data.details?.[rowIndex]?.[columnIndex];
        const lines = heatmapTooltipLines({ row, column, value, details });
        const label = lines.join("\n");
        const color = Number.isFinite(value) ? (diverging ? divergingColorFor(value, center, magnitude) : colorFor(value, minimum, maximum)) : "action.disabledBackground";
        return <Tooltip key={column.key} title={label}><Box aria-label={label} data-color-scale={diverging ? "diverging" : "sequential"} data-cell-color={color} sx={{ minHeight: 42, display: "grid", placeItems: "center", borderRadius: 1, bgcolor: color, color: "rgba(255,255,255,0.94)", fontWeight: 700 }}>{Number.isFinite(value) ? formatValue(value, precision) : "—"}</Box></Tooltip>;
      })}
    </Box>)}
  </Box>;
};

export default HeatmapAnalyticalGraph;
