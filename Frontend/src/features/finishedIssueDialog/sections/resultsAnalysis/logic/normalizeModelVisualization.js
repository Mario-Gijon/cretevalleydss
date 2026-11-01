import { getVisualizationReadingGuide } from "./visualizationReadingGuides.js";

const AHP_INDIVIDUAL_COLLECTIVE_KEY = "ahp-individual-collective-weights";

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const isCollectiveRow = (row) =>
  (typeof row?.key === "string" && row.key.toLowerCase() === "collective") ||
  (typeof row?.source === "string" && row.source.toLowerCase() === "mcc") ||
  (typeof row?.label === "string" && row.label.toLowerCase() === "collective");

const upgradeHistoricalAHPWeightsHeatmap = (visualization) => {
  if (visualization?.key !== AHP_INDIVIDUAL_COLLECTIVE_KEY || visualization?.type !== "heatmap")
    return visualization;

  const { rows, columns, values, details } = visualization.data || {};
  if (!Array.isArray(rows) || rows.length < 2 || !Array.isArray(columns) || !columns.length || !Array.isArray(values) || values.length !== rows.length)
    return visualization;
  if (columns.some((column) => !column || !((typeof column.label === "string" && column.label.trim()) || (typeof column.key === "string" && column.key.trim())))) return visualization;
  if (values.some((row) => !Array.isArray(row) || row.length !== columns.length)) return visualization;
  if (rows.filter((row) => !isCollectiveRow(row)).length < 2 || !rows.some(isCollectiveRow)) return visualization;

  const nameCounts = new Map();
  rows.forEach((row) => {
    const label = typeof row?.label === "string" && row.label.trim() ? row.label.trim() : "Unnamed expert";
    nameCounts.set(label, (nameCounts.get(label) || 0) + 1);
  });
  const series = rows.map((row, rowIndex) => {
    const rowKey = typeof row?.key === "string" && row.key.trim() ? row.key.trim() : `expert-${rowIndex + 1}`;
    const rowLabel = typeof row?.label === "string" && row.label.trim() ? row.label.trim() : "Unnamed expert";
    const isCollective = isCollectiveRow(row);
    const duplicateSuffix = !isCollective && nameCounts.get(rowLabel) > 1
      ? ` (${rows.slice(0, rowIndex).filter((candidate) => typeof candidate?.label === "string" && candidate.label.trim() === rowLabel).length + 1})`
      : "";
    const label = isCollective ? "Collective MCC" : `${rowLabel}${duplicateSuffix}`;
    const points = columns.flatMap((column, columnIndex) => {
      const weight = values[rowIndex][columnIndex];
      if (!isFiniteNumber(weight)) return [];
      const criterionName = typeof column.label === "string" && column.label.trim() ? column.label.trim() : column.key;
      const sourceDetail = details?.[rowIndex]?.[columnIndex]?.source;
      return [{
        id: `${rowKey}:${column.key || columnIndex}`,
        label: criterionName,
        x: weight,
        y: columnIndex + 1,
        details: {
          Expert: isCollective ? "Collective" : label,
          "Weight (%)": weight,
          Source: isCollective ? "MCC collective result" : (sourceDetail || "Individual AHP"),
        },
      }];
    });
    return {
      key: rowKey,
      label,
      pointStyle: isCollective ? "rectRot" : "circle",
      pointRadius: isCollective ? 7 : 5.5,
      points,
    };
  });

  const pointsByCriterion = columns.map((_, columnIndex) => series.flatMap((item) => {
    const point = item.points.find((candidate) => candidate.y === columnIndex + 1);
    return point ? [{ series: item, point }] : [];
  }));
  pointsByCriterion.forEach((entries) => entries.forEach(({ series: item, point }) => {
    const coincident = entries
      .filter((entry) => entry.series.key !== item.key && entry.point.x === point.x)
      .map((entry) => entry.series.label);
    if (coincident.length) point.details["Coincident with"] = coincident.join(", ");
  }));

  const guide = getVisualizationReadingGuide({ key: visualization.key });
  return {
    ...visualization,
    type: "scatter",
    description: guide.text,
    presentation: {
      ...(visualization.presentation || {}),
      stableSeriesColors: true,
      pointStyleLegend: true,
      tooltip: { ...(visualization.presentation?.tooltip || {}), variant: "point-details" },
    },
    xAxis: { label: "Importance (%)", min: 0, max: 100, tickSuffix: "%" },
    yAxis: {
      label: "Criterion",
      min: 0.5,
      max: columns.length + 0.5,
      reverse: true,
      categories: columns.map((column, index) => ({ value: index + 1, label: column.label || column.key })),
    },
    data: { series },
  };
};

/** Render old persisted AHP heatmaps through the current generic visualization contract. */
export const normalizeModelVisualization = (visualization) =>
  upgradeHistoricalAHPWeightsHeatmap(visualization);

export default normalizeModelVisualization;
