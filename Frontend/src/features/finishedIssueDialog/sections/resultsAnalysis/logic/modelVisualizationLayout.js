const collectionLength = (value) => Array.isArray(value) ? value.length : 0;
const COMPACT_CHART_HEIGHT = Object.freeze({ xs: 300, sm: 320 });
const DYNAMIC_CHART_MIN_HEIGHT = 320;
const DYNAMIC_CHART_MAX_HEIGHT = 800;
const HORIZONTAL_BAR_CATEGORY_HEIGHT = 32;
const HORIZONTAL_BAR_CHROME_HEIGHT = 104;
const HEATMAP_ROW_HEIGHT = 34;
const HEATMAP_CHROME_HEIGHT = 124;

const chartHeight = () => COMPACT_CHART_HEIGHT;
const categoricalChartWidth = (itemCount, pixelsPerItem, threshold) => itemCount > threshold ? itemCount * pixelsPerItem : undefined;
const dynamicChartHeight = (itemCount, pixelsPerItem, chromeHeight) => {
  const height = Math.min(
    DYNAMIC_CHART_MAX_HEIGHT,
    Math.max(DYNAMIC_CHART_MIN_HEIGHT, itemCount * pixelsPerItem + chromeHeight)
  );

  return { xs: height, sm: height };
};

export const getVisualizationLayout = (visualization) => {
  const data = visualization?.data || {};
  if (visualization?.type === "bar") {
    const categoryCount = collectionLength(data.categories);
    if (visualization.orientation === "horizontal") {
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
  if (visualization?.type === "line") return { span: 1, chartHeight: chartHeight(), chartMinWidth: categoricalChartWidth(collectionLength(data.x), 68, 8) };
  if (visualization?.type === "heatmap") return {
    span: 1,
    chartHeight: dynamicChartHeight(
      collectionLength(data.rows),
      HEATMAP_ROW_HEIGHT,
      HEATMAP_CHROME_HEIGHT
    ),
    chartMinWidth: categoricalChartWidth(collectionLength(data.columns), 84, 5),
  };
  return { span: 1, chartHeight: chartHeight() };
};

export const buildVisualizationLayout = (visualizations) => {
  const entries = (Array.isArray(visualizations) ? visualizations : []).map((visualization) => ({
    visualization,
    ...getVisualizationLayout(visualization),
  }));
  if (entries.length % 2) entries[entries.length - 1].span = 2;
  return entries;
};
