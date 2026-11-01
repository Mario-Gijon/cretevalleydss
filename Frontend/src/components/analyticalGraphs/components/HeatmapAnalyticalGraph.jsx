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
const TOPSIS_PROFILE_HEATMAP_KEYS = new Set(["topsis-collective-performance-profile"]);
const ALTERNATIVE_RELATIONSHIPS_HEATMAP_KEYS = new Set(["alternative-relationships"]);
const AHP_MCC_ADJUSTMENT_KEY = "ahp-mcc-adjustment-map";
const AHP_MCC_ADJUSTMENT_LEGEND = { negative: "Decrease", center: "0", positive: "Increase" };
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

export const heatmapTooltipLines = ({ row, column, value, details, valueSuffix = "", precision: precisionOverride }) => {
  const precision = valuePrecision(details?.valuePrecision ?? precisionOverride);
  const note = typeof details?.note === "string" ? details.note : null;
  const cellValue = Number.isFinite(value) ? `${formatValue(value, precision)}${valueSuffix}` : note || "Unavailable";
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
  const legacyAHPAdjustmentUnits = visualization?.key === AHP_MCC_ADJUSTMENT_KEY &&
    visualization?.presentation?.heatmapStyle !== "adjustment" &&
    visualization?.scale?.valueSuffix !== " pp";
  const adjustmentHeatmap = visualization?.presentation?.heatmapStyle === "adjustment" || legacyAHPAdjustmentUnits;
  const truncateLabels = visualization?.truncateLabels === true;
  const mccAdjustmentMap = ["mcc-adjustment-map", "ahp-mcc-adjustment-map"].includes(visualization?.key);
  const twoTupleHeatmap = TWO_TUPLE_HEATMAP_KEYS.has(visualization?.key);
  const topsisProfile = TOPSIS_PROFILE_HEATMAP_KEYS.has(visualization?.key);
  const alternativeRelationships = ALTERNATIVE_RELATIONSHIPS_HEATMAP_KEYS.has(visualization?.key);
  const showColumnTooltips = truncateLabels || mccAdjustmentMap || twoTupleHeatmap || topsisProfile;
  const labelColumn = mccAdjustmentMap
    ? "minmax(180px, 240px)"
    : twoTupleHeatmap || topsisProfile || alternativeRelationships
      ? "240px"
      : truncateLabels
        ? "minmax(90px, 220px)"
        : "minmax(90px, auto)";
  const criterionColumnMinWidth = mccAdjustmentMap || twoTupleHeatmap || topsisProfile ? 150 : 64;
  const columnTemplate = topsisProfile
    ? `240px repeat(${data.columns.length}, 150px)`
    : alternativeRelationships
      ? `240px repeat(${data.columns.length}, 112px)`
      : `${labelColumn} repeat(${data.columns.length}, minmax(${criterionColumnMinWidth}px, 1fr))`;
  const precision = valuePrecision(visualization?.scale?.valuePrecision);
  const valueSuffix = legacyAHPAdjustmentUnits
    ? " pp"
    : typeof visualization?.scale?.valueSuffix === "string" ? visualization.scale.valueSuffix : "";
  const center = Number.isFinite(visualization?.scale?.center) ? visualization.scale.center : 0;
  const magnitude = finiteValues.reduce((maximumDeviation, value) => Math.max(maximumDeviation, Math.abs(value - center)), 0);
  const rows = <Box data-testid="heatmap-analytical-graph" sx={{ display: "grid", width: topsisProfile || alternativeRelationships ? "fit-content" : truncateLabels || mccAdjustmentMap || twoTupleHeatmap ? "100%" : undefined, gridTemplateColumns: columnTemplate, gap: adjustmentHeatmap ? 1 : 0.5 }}>
    <Box />
    {data.columns.map((column) => topsisProfile ? <Box key={column.key} data-testid="topsis-criterion-header" data-direction={column.direction} title={column.label || column.key} sx={{ minWidth: 0, textAlign: "center" }}>
      <Typography variant="overline" color={column.direction === "max" ? "success.light" : column.direction === "min" ? "warning.light" : "text.secondary"} sx={{ display: "block", fontSize: 10, lineHeight: 1.1, fontWeight: 800 }}>{column.direction === "max" ? "Benefit" : column.direction === "min" ? "Cost" : "Direction unavailable"}</Typography>
      <Typography variant="caption" sx={{ textAlign: "center", fontWeight: 700, display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden", overflowWrap: "anywhere", lineHeight: 1.25 }}>{column.label || column.key}</Typography>
    </Box> : adjustmentHeatmap ? <Tooltip key={column.key} title={column.label || column.key} placement="top">
      <Typography variant="caption" noWrap aria-label={column.label || column.key} tabIndex={0} sx={{ textAlign: "center", fontWeight: 700, minWidth: 0 }}>{column.label || column.key}</Typography>
    </Tooltip> : <Typography key={column.key} title={showColumnTooltips ? column.label || column.key : undefined} variant="caption" noWrap={showColumnTooltips && !twoTupleHeatmap} aria-label={showColumnTooltips ? column.label || column.key : undefined} tabIndex={showColumnTooltips ? 0 : undefined} sx={{ textAlign: "center", fontWeight: 700, ...(showColumnTooltips ? { minWidth: 0 } : {}), ...(twoTupleHeatmap ? { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden", overflowWrap: "anywhere", lineHeight: 1.25 } : {}) }}>{column.label || column.key}</Typography>)}
    {data.rows.map((row, rowIndex) => <Box key={row.key} sx={{ display: "contents" }}>
      {adjustmentHeatmap ? <Tooltip title={row.label || row.key} placement="right">
        <Typography variant="caption" noWrap aria-label={row.label || row.key} tabIndex={0} sx={{ alignSelf: "center", fontWeight: 700, minWidth: 0 }}>{row.label || row.key}</Typography>
      </Tooltip> : <Typography title={truncateLabels || mccAdjustmentMap || twoTupleHeatmap ? row.label || row.key : undefined} variant="caption" noWrap={truncateLabels || twoTupleHeatmap} aria-label={mccAdjustmentMap ? row.label || row.key : undefined} tabIndex={mccAdjustmentMap ? 0 : undefined} sx={{ alignSelf: "center", fontWeight: 700, ...(truncateLabels || mccAdjustmentMap || twoTupleHeatmap ? { minWidth: 0 } : {}), ...(mccAdjustmentMap ? { overflowWrap: "anywhere" } : {}) }}>{row.label || row.key}</Typography>}
      {data.columns.map((column, columnIndex) => {
        const value = data.values[rowIndex]?.[columnIndex];
        const details = data.details?.[rowIndex]?.[columnIndex];
        const displayDetails = legacyAHPAdjustmentUnits && details && typeof details === "object"
          ? Object.fromEntries(Object.entries(details).map(([key, detail]) => {
              const normalizedKey = key.replace(/[^a-z]/gi, "").toLowerCase();
              const numericDetail = typeof detail === "number" ? detail : Number(detail);
              if (!Number.isFinite(numericDetail)) return [key, detail];
              if (["originalweight", "adjustedweight", "collectiveweight"].includes(normalizedKey))
                return [key, `${formatValue(numericDetail * 100)}%`];
              if (["delta", "change"].includes(normalizedKey))
                return ["Change", `${formatValue(numericDetail * 100)} pp`];
              return [key, detail];
            }))
          : details;
        const displayValue = Number.isFinite(value) && legacyAHPAdjustmentUnits ? value * 100 : value;
        const lines = heatmapTooltipLines({ row, column, value: displayValue, details: displayDetails, valueSuffix, precision });
        const label = lines.join("\n");
        const color = Number.isFinite(value) ? (diverging ? divergingColorFor(value, center, magnitude) : colorFor(value, minimum, maximum)) : "action.disabledBackground";
        return <Tooltip key={column.key} title={label}><Box {...(adjustmentHeatmap ? { role: "img", tabIndex: 0 } : {})} aria-label={label} data-color-scale={diverging ? "diverging" : "sequential"} data-cell-color={color} sx={{ minHeight: adjustmentHeatmap ? 36 : 42, display: "grid", placeItems: "center", borderRadius: adjustmentHeatmap ? 1.8 : 1, px: 0.65, bgcolor: color, color: "rgba(255,255,255,0.94)", fontWeight: 700, ...(adjustmentHeatmap ? { outline: "1px solid rgba(255,255,255,0.08)", outlineOffset: "-1px" } : {}) }}>{Number.isFinite(displayValue) ? `${formatValue(displayValue, precision)}${valueSuffix}` : "—"}</Box></Tooltip>;
      })}
    </Box>)}
  </Box>;
  const legend = visualization?.scale?.legend || (legacyAHPAdjustmentUnits ? AHP_MCC_ADJUSTMENT_LEGEND : null);
  const scaleLabel = visualization?.scale?.label || (legacyAHPAdjustmentUnits ? "Change (percentage points)" : null);
  return <Box sx={{ minWidth: 0 }}>
    {typeof scaleLabel === "string" ? <Box role="group" aria-label={scaleLabel} sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.25, mb: 0.8 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{scaleLabel}</Typography>
      {legend ? <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.45 }}><Box aria-hidden="true" sx={{ width: 9, height: 9, borderRadius: 0.4, bgcolor: "rgba(232,137,181,0.82)" }} /><Typography variant="caption" color="text.secondary">{legend.negative}</Typography></Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.45 }}><Box aria-hidden="true" sx={{ width: 9, height: 9, borderRadius: 0.4, bgcolor: neutralColor }} /><Typography variant="caption" color="text.secondary">{legend.center}</Typography></Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.45 }}><Box aria-hidden="true" sx={{ width: 9, height: 9, borderRadius: 0.4, bgcolor: "rgba(83,198,214,0.82)" }} /><Typography variant="caption" color="text.secondary">{legend.positive}</Typography></Box>
      </Box> : null}
    </Box> : null}
    {rows}
  </Box>;
};

export default HeatmapAnalyticalGraph;
