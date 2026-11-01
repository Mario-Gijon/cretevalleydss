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
const horizontalBarChartWidth = (categories) => {
  const longestLabelLength = categories.reduce(
    (longest, category) => Math.max(longest, typeof category === "string" ? category.length : 0),
    0,
  );
  return longestLabelLength > 38 ? Math.min(1200, longestLabelLength * 7 + 240) : undefined;
};
const dynamicChartHeight = (itemCount, pixelsPerItem, chromeHeight) => {
  const height = Math.min(
    DYNAMIC_CHART_MAX_HEIGHT,
    Math.max(DYNAMIC_CHART_MIN_HEIGHT, itemCount * pixelsPerItem + chromeHeight)
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
const categoricalScatterWidth = (categories) => {
  const longestLabelLength = categories.reduce(
    (longest, category) => Math.max(
      longest,
      typeof category?.label === "string" ? category.label.length : 0,
    ),
    0,
  );
  return longestLabelLength > 38
    ? Math.min(1200, longestLabelLength * 7 + 220)
    : undefined;
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
      const chartMinWidth = horizontalBarChartWidth(data.categories);
      return {
        span: 1,
        chartHeight: dynamicChartHeight(
          categoryCount,
          HORIZONTAL_BAR_CATEGORY_HEIGHT,
          HORIZONTAL_BAR_CHROME_HEIGHT
        ),
        ...(chartMinWidth ? { chartMinWidth } : {}),
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
      chartMinWidth: categoricalScatterWidth(normalizedVisualization.yAxis.categories),
    };
  }
  if (normalizedVisualization?.type === "heatmap") {
    const columnCount = collectionLength(data.columns);
    const mccAdjustmentMap = ["mcc-adjustment-map", "ahp-mcc-adjustment-map"].includes(normalizedVisualization.key);
    const twoTupleHeatmap = TWO_TUPLE_HEATMAP_KEYS.has(normalizedVisualization.key);
    const topsisProfile = TOPSIS_PROFILE_HEATMAP_KEYS.has(normalizedVisualization.key);
    return {
      span: 1,
      chartHeight: dynamicChartHeight(
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
