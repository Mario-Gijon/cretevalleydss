import {
  getPreferenceDistributionMetrics,
  isIndividualPreferenceDistribution,
} from "../../../../../components/analyticalGraphs/logic/preferenceDistributionMatrix.js";
import { resolveVisualizationPresentation } from "./resolveVisualizationPresentation.js";
import { normalizeModelVisualization } from "./normalizeModelVisualization.js";

const collectionLength = (value) => Array.isArray(value) ? value.length : 0;
const COMPACT_CHART_HEIGHT = Object.freeze({ xs: 300, sm: 320 });
const DYNAMIC_CHART_MIN_HEIGHT = 320;
const DYNAMIC_CHART_MAX_HEIGHT = 800;
const CATEGORICAL_SCATTER_MAX_HEIGHT = 1600;
const HORIZONTAL_BAR_CATEGORY_HEIGHT = 32;
const HORIZONTAL_BAR_CHROME_HEIGHT = 104;
const HEATMAP_ROW_HEIGHT = 34;
const HEATMAP_CHROME_HEIGHT = 124;
// Keep these MCC-only metrics aligned with HeatmapAnalyticalGraph's 36px
// adjustment cells, 20px captions, 8px grid gap and optional legend spacing.
const MCC_ADJUSTMENT_CELL_HEIGHT = 36;
const HEATMAP_CAPTION_LINE_HEIGHT = 20;
const HEATMAP_GRID_GAP = 8;
const MCC_ADJUSTMENT_LEGEND_MARGIN = 6.4;
// AnalyticalGraph reserves this bottom gutter inside every chart viewport.
const GRAPH_VIEWPORT_SCROLLBAR_GUTTER = 12;
const MCC_ADJUSTMENT_LABEL_COLUMN_MIN_WIDTH = 180;
const MCC_ADJUSTMENT_CRITERION_COLUMN_MIN_WIDTH = 150;
const TWO_TUPLE_LABEL_COLUMN_MIN_WIDTH = 240;
const TWO_TUPLE_CRITERION_COLUMN_MIN_WIDTH = 150;
const HEATMAP_COLUMN_GAP = 4;
const TWO_TUPLE_HEATMAP_KEYS = new Set([
  "two-tuple-collective-profile",
  "two-tuple-alpha-heatmap",
  "collective-beta-heatmap",
  "alpha-heatmap",
]);
const TOPSIS_PROFILE_HEATMAP_KEYS = new Set(["topsis-collective-performance-profile"]);

const chartHeight = () => COMPACT_CHART_HEIGHT;
const categoricalChartWidth = (itemCount, pixelsPerItem, threshold) => itemCount > threshold ? itemCount * pixelsPerItem : undefined;
const dynamicChartHeight = (itemCount, pixelsPerItem, chromeHeight) => {
  const height = Math.min(
    DYNAMIC_CHART_MAX_HEIGHT,
    Math.max(DYNAMIC_CHART_MIN_HEIGHT, itemCount * pixelsPerItem + chromeHeight)
  );

  return { xs: height, sm: height };
};
const mccAdjustmentChartHeight = (rowCount, hasLegend) => {
  const legendHeight = hasLegend
    ? HEATMAP_CAPTION_LINE_HEIGHT + MCC_ADJUSTMENT_LEGEND_MARGIN
    : 0;
  const headingHeight = HEATMAP_CAPTION_LINE_HEIGHT;
  const rowsHeight = rowCount * (MCC_ADJUSTMENT_CELL_HEIGHT + HEATMAP_GRID_GAP);
  const height = Math.ceil(
    legendHeight + headingHeight + rowsHeight + GRAPH_VIEWPORT_SCROLLBAR_GUTTER
  );

  return { xs: height, sm: height };
};
const categoricalScatterHeight = (itemCount) => {
  const height = Math.min(
    CATEGORICAL_SCATTER_MAX_HEIGHT,
    Math.max(DYNAMIC_CHART_MIN_HEIGHT, itemCount * 28 + 132)
  );

  return { xs: height, sm: height };
};
export const getVisualizationLayout = (visualization) => {
  const normalizedVisualization = normalizeModelVisualization(visualization);
  const data = normalizedVisualization?.data || {};
  const presentation = resolveVisualizationPresentation(normalizedVisualization);
  const preferredChartHeight = presentation.chartHeight;
  if (isIndividualPreferenceDistribution(normalizedVisualization)) {
    return { span: 1, chartHeight: chartHeight(), chartMinWidth: getPreferenceDistributionMetrics(normalizedVisualization).chartMinWidth };
  }
  if (normalizedVisualization?.type === "bar") {
    const categoryCount = collectionLength(data.categories);
    if (normalizedVisualization.orientation === "horizontal") {
      return {
        span: 1,
        chartHeight: dynamicChartHeight(
          categoryCount,
          HORIZONTAL_BAR_CATEGORY_HEIGHT,
          HORIZONTAL_BAR_CHROME_HEIGHT
        ),
      };
    }
    return { span: 1, chartHeight: chartHeight(), chartMinWidth: categoricalChartWidth(categoryCount, 72, 6) };
  }
  if (normalizedVisualization?.type === "line") {
    const chartMinWidth = presentation.chartMinWidth
      ?? (data.xScaleType === "linear" ? undefined : categoricalChartWidth(collectionLength(data.x), 68, 8));
    return { span: 1, chartHeight: preferredChartHeight || chartHeight(), ...(chartMinWidth ? { chartMinWidth } : {}) };
  }
  if (normalizedVisualization?.type === "scatter" && Array.isArray(normalizedVisualization.yAxis?.categories)) {
    return {
      span: 1,
      chartHeight: categoricalScatterHeight(normalizedVisualization.yAxis.categories.length),
    };
  }
  if (normalizedVisualization?.type === "heatmap") {
    const columnCount = collectionLength(data.columns);
    const mccAdjustmentMap = ["mcc-adjustment-map", "ahp-mcc-adjustment-map"].includes(normalizedVisualization.key);
    const twoTupleHeatmap = TWO_TUPLE_HEATMAP_KEYS.has(normalizedVisualization.key);
    const topsisProfile = TOPSIS_PROFILE_HEATMAP_KEYS.has(normalizedVisualization.key);
    const legacyAHPAdjustmentLegend = normalizedVisualization.key === "ahp-mcc-adjustment-map"
      && normalizedVisualization.presentation?.heatmapStyle !== "adjustment"
      && normalizedVisualization.scale?.valueSuffix !== " pp";
    const hasMccAdjustmentLegend = typeof normalizedVisualization.scale?.label === "string"
      || (normalizedVisualization.scale?.legend && typeof normalizedVisualization.scale.legend === "object")
      || legacyAHPAdjustmentLegend;
    return {
      span: 1,
      chartHeight: mccAdjustmentMap
        ? mccAdjustmentChartHeight(collectionLength(data.rows), hasMccAdjustmentLegend)
        : dynamicChartHeight(
          collectionLength(data.rows),
          HEATMAP_ROW_HEIGHT,
          HEATMAP_CHROME_HEIGHT
        ),
      chartMinWidth: mccAdjustmentMap
        ? MCC_ADJUSTMENT_LABEL_COLUMN_MIN_WIDTH
          + columnCount * (MCC_ADJUSTMENT_CRITERION_COLUMN_MIN_WIDTH + HEATMAP_COLUMN_GAP)
        : twoTupleHeatmap
          ? TWO_TUPLE_LABEL_COLUMN_MIN_WIDTH
            + columnCount * (TWO_TUPLE_CRITERION_COLUMN_MIN_WIDTH + HEATMAP_COLUMN_GAP)
          : topsisProfile
            ? TWO_TUPLE_LABEL_COLUMN_MIN_WIDTH
              + columnCount * (TWO_TUPLE_CRITERION_COLUMN_MIN_WIDTH + HEATMAP_COLUMN_GAP)
          : categoricalChartWidth(columnCount, 84, 5),
    };
  }
  return { span: 1, chartHeight: preferredChartHeight || chartHeight() };
};

export const buildVisualizationLayout = (visualizations) => {
  const entries = (Array.isArray(visualizations) ? visualizations : []).map((visualization) => ({
    visualization,
    ...getVisualizationLayout(visualization),
  }));
  if (entries.length % 2) entries[entries.length - 1].span = 2;
  return entries;
};
