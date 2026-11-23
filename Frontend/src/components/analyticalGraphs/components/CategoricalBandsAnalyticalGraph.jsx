import { Box, Typography } from "@mui/material";

import GraphUnavailable from "./GraphUnavailable.jsx";
import { chartAccessibleLabel } from "../chartTheme.js";

const CATEGORY_TINTS = [
  "rgba(239, 83, 80, 0.075)",
  "rgba(255, 193, 7, 0.065)",
  "rgba(102, 187, 106, 0.075)",
];
const VIEW_WIDTH = 1000;
const LEFT = 162;
const RIGHT = 26;
const TOP = 30;
const BOTTOM = 58;

const formatWeight = (value) => Number.isFinite(value) ? value.toFixed(2) : "Unavailable";
const escapeText = (value) => String(value ?? "");
const alternativeColor = (index, count) => {
  const hue = (18 + (index * 360) / Math.max(1, count)) % 360;
  const lightness = index % 2 === 0 ? 66 : 58;
  return `hsl(${hue} 78% ${lightness}%)`;
};
const detailLines = (point) => Object.entries(point?.details || {})
  .filter(([, value]) => value !== null && value !== undefined)
  .map(([key, value]) => `${key}: ${typeof value === "number" ? String(value) : String(value)}`);

const CategoricalBandsAnalyticalGraph = ({ visualization }) => {
  const data = visualization?.data;
  const categories = Array.isArray(visualization?.yAxis?.categories)
    ? visualization.yAxis.categories
    : [];
  const series = Array.isArray(data?.series) ? data.series.filter((item) => Array.isArray(item?.values)) : [];
  if (!categories.length || !series.length) return <GraphUnavailable />;

  const alternativeIds = [...new Set(series.map((item) => item.alternativeId).filter(Boolean))];
  const declaredOrder = Array.isArray(data.alternativeOrder) ? data.alternativeOrder : [];
  const order = [...declaredOrder, ...alternativeIds.filter((id) => !declaredOrder.includes(id))];
  const visibleIds = alternativeIds.sort((left, right) => order.indexOf(left) - order.indexOf(right));
  const colorByAlternative = new Map(visibleIds.map((id) => [
    id,
    alternativeColor(order.indexOf(id), order.length),
  ]));
  const alternativeNames = new Map();
  series.forEach((item) => alternativeNames.set(item.alternativeId, item.alternativeName || item.label || item.alternativeId));

  const bandHeight = Math.max(76, 26 + visibleIds.length * 15);
  const height = TOP + categories.length * bandHeight + BOTTOM;
  const plotRight = VIEW_WIDTH - RIGHT;
  const plotWidth = plotRight - LEFT;
  const plotTop = TOP;
  const plotBottom = plotTop + categories.length * bandHeight;
  const xPosition = (weight) => LEFT + Math.max(0, Math.min(1, weight)) * plotWidth;
  const categoryY = (categoryIndex) => plotTop + (categories.length - 1 - categoryIndex) * bandHeight;
  const categoryByValue = new Map(categories.map((category, index) => [category.value ?? index, category]));
  const legendItems = visibleIds.map((id) => ({ id, name: alternativeNames.get(id) || id, color: colorByAlternative.get(id) }));
  const unavailableByWeight = new Map();

  series.forEach((item) => item.values.forEach((point) => {
    if (Number.isInteger(point?.y)) return;
    const weight = point?.x;
    if (!Number.isFinite(weight)) return;
    const reasons = unavailableByWeight.get(weight) || [];
    reasons.push(`${item.alternativeName || item.label || item.alternativeId}: ${point?.details?.["Unavailable reason"] || "sample unavailable"}`);
    unavailableByWeight.set(weight, reasons);
  }));

  const accessibleLabel = chartAccessibleLabel(visualization, [
    ...categories.map((category) => category.label),
    ...legendItems.map((item) => item.name),
  ]);

  return <Box data-testid="categorical-bands-analytical-graph" sx={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", minHeight: 260 }}>
    <Box component="ul" aria-label="Alternative color legend" sx={{ display: "flex", flexWrap: "wrap", listStyle: "none", p: 0, m: 0, mb: 0.6, columnGap: 1.6, rowGap: 0.5 }}>
      {legendItems.map((item) => <Box component="li" key={item.id} aria-label={`Alternative: ${item.name}`} sx={{ display: "flex", alignItems: "center", gap: 0.6, minWidth: 0 }}>
        <Box aria-hidden="true" sx={{ width: 18, height: 9, borderRadius: 99, flex: "0 0 auto", bgcolor: item.color }} />
        <Typography component="span" variant="caption" sx={{ overflowWrap: "anywhere", lineHeight: 1.25 }}>{item.name}</Typography>
      </Box>)}
      <Box component="li" aria-label="Original criterion weight marker" sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
        <Box aria-hidden="true" sx={{ height: 12, borderLeft: "2px dashed #F5AD5C" }} />
        <Typography component="span" variant="caption">Original weight</Typography>
      </Box>
    </Box>
    <Box sx={{ flex: "1 1 auto", minHeight: 0, width: "100%" }}>
      <svg
        role="img"
        aria-label={accessibleLabel}
        title={accessibleLabel}
        data-testid="categorical-bands-svg"
        data-category-count={categories.length}
        data-alternative-count={visibleIds.length}
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        preserveAspectRatio="none"
        style={{ display: "block", overflow: "visible" }}
      >
        {categories.map((category, categoryIndex) => {
          const y = categoryY(categoryIndex);
          const label = escapeText(category.label);
          return <g key={`band-${category.value ?? categoryIndex}`} data-testid="category-band" data-category={label}>
            <rect x={LEFT} y={y} width={plotWidth} height={bandHeight} fill={CATEGORY_TINTS[Math.round(categoryIndex / Math.max(1, categories.length - 1) * 2)] || CATEGORY_TINTS[1]} />
            <line x1={LEFT} x2={plotRight} y1={y + bandHeight} y2={y + bandHeight} stroke="rgba(255,255,255,0.13)" />
            <text x={LEFT - 12} y={y + bandHeight / 2} textAnchor="end" dominantBaseline="middle" fill="rgba(255,255,255,0.88)" fontSize="15" fontWeight="600">{label}</text>
          </g>;
        })}

        {series.map((item) => {
          const alternativeIndex = visibleIds.indexOf(item.alternativeId);
          const laneHeight = (bandHeight - 26) / Math.max(1, visibleIds.length);
          const laneOffset = 13 + (alternativeIndex + 0.5) * laneHeight;
          const color = colorByAlternative.get(item.alternativeId) || "#4CC9F0";
          const points = item.values;
          const blocks = [];
          for (let index = 0; index < points.length - 1; index += 1) {
            const point = points[index];
            const next = points[index + 1];
            const categoryIndex = Number.isInteger(point?.y) ? point.y : null;
            if (!Number.isFinite(point?.x) || !Number.isFinite(next?.x) || !Number.isInteger(categoryIndex) || !categoryByValue.has(categoryIndex)) continue;
            const intervalStart = point.x;
            const intervalEnd = next.x;
            const bandY = categoryY(categoryIndex);
            const centerY = bandY + laneOffset;
            const x = xPosition(intervalStart);
            const endX = xPosition(intervalEnd);
            const width = Math.max(1, endX - x);
            const blockHeight = Math.min(16, laneHeight * 0.72);
            const categoryLabel = categoryByValue.get(categoryIndex)?.label || "Category";
            const connectedLeft = index > 0 && Number.isInteger(points[index - 1]?.y) && points[index - 1].y === categoryIndex;
            const connectedRight = index + 1 < points.length - 1
              && Number.isInteger(points[index + 1]?.y)
              && points[index + 1].y === categoryIndex;
            const tooltip = [
              item.alternativeName || item.label || item.alternativeId,
              `Sample interval: ${formatWeight(intervalStart)}–${formatWeight(intervalEnd)}`,
              `Sampled at: ${formatWeight(intervalStart)}`,
              ...detailLines(point),
            ].join("\n");
            blocks.push(<rect
              key={`${item.key}:${index}`}
              data-testid="category-interval-block"
              data-alternative-id={item.alternativeId}
              data-category={categoryLabel}
              data-sample-weight={point.x}
              x={x}
              y={centerY - blockHeight / 2}
              width={width}
              height={blockHeight}
              fill={color}
              stroke="none"
            ><title>{tooltip}</title></rect>);
            if (!connectedLeft) {
              blocks.push(<circle key={`${item.key}:${index}:start`} cx={x} cy={centerY} r={blockHeight / 2} fill={color}><title>{tooltip}</title></circle>);
            }
            if (!connectedRight) {
              blocks.push(<circle key={`${item.key}:${index}:end`} cx={endX} cy={centerY} r={blockHeight / 2} fill={color}><title>{tooltip}</title></circle>);
            }
          }
          const last = points.at(-1);
          const lastCategoryIndex = Number.isInteger(last?.y) ? last.y : null;
          if (last && Number.isInteger(lastCategoryIndex) && categoryByValue.has(lastCategoryIndex)) {
            const categoryLabel = categoryByValue.get(lastCategoryIndex)?.label || "Category";
            const bandY = categoryY(lastCategoryIndex);
            const centerY = bandY + laneOffset;
            const x = xPosition(last.x);
            const tooltip = [
              item.alternativeName || item.label || item.alternativeId,
              `Sampled weight: ${formatWeight(last.x)}`,
              ...detailLines(last),
            ].join("\n");
            blocks.push(<rect
              key={`${item.key}:last`}
              data-testid="category-sample-marker"
              data-alternative-id={item.alternativeId}
              data-category={categoryLabel}
              data-sample-weight={last.x}
              x={x - 5}
              y={centerY - 5}
              width="10"
              height="10"
              rx="5"
              fill={color}
              stroke="rgba(8,15,25,0.72)"
              strokeWidth="0.8"
            ><title>{tooltip}</title></rect>);
          }
          return <g key={item.key}>{blocks}</g>;
        })}

        {Number.isFinite(data.configuredWeight) ? <g data-testid="original-weight-marker">
          <line x1={xPosition(data.configuredWeight)} x2={xPosition(data.configuredWeight)} y1={plotTop} y2={plotBottom} stroke="#F5AD5C" strokeWidth="2" strokeDasharray="5 4" opacity="0.95" />
          <text x={xPosition(data.configuredWeight)} y={plotTop - 9} textAnchor="middle" fill="#F5AD5C" fontSize="12" fontWeight="700">Original</text>
          <title>{`Original criterion weight: ${data.configuredWeight}`}</title>
        </g> : null}

        {[0, 0.25, 0.5, 0.75, 1].map((weight) => <g key={`tick-${weight}`}>
          <line x1={xPosition(weight)} x2={xPosition(weight)} y1={plotBottom} y2={plotBottom + 5} stroke="rgba(255,255,255,0.55)" />
          <text x={xPosition(weight)} y={plotBottom + 20} textAnchor="middle" fill="rgba(255,255,255,0.72)" fontSize="12">{formatWeight(weight)}</text>
        </g>)}
        <line x1={LEFT} x2={plotRight} y1={plotBottom} y2={plotBottom} stroke="rgba(255,255,255,0.48)" />
        <text x={(LEFT + plotRight) / 2} y={height - 7} textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="13">Varied criterion weight</text>

        {[...unavailableByWeight.entries()].map(([weight, reasons]) => {
          const x = xPosition(weight);
          return <g key={`unavailable-${weight}`} data-testid="unavailable-sample-marker" data-weight={weight}>
            <path d={`M ${x} ${plotBottom + 31} l 5 5 l -5 5 l -5 -5 z`} fill="#9AA4B2" stroke="#263342" strokeWidth="1" />
            <title>{[`Unavailable sample at ${formatWeight(weight)}`, ...reasons].join("\n")}</title>
          </g>;
        })}
      </svg>
    </Box>
  </Box>;
};

export default CategoricalBandsAnalyticalGraph;
