const collectionLength = (value) => Array.isArray(value) ? value.length : 0;
const chartHeight = () => ({ xs: 300, sm: 320 });
const categoricalChartWidth = (itemCount, pixelsPerItem, threshold) => itemCount > threshold ? itemCount * pixelsPerItem : undefined;

export const getVisualizationLayout = (visualization) => {
  const data = visualization?.data || {};
  if (visualization?.type === "bar") return { span: 1, chartHeight: chartHeight(), chartMinWidth: categoricalChartWidth(collectionLength(data.categories), 72, 6) };
  if (visualization?.type === "line") return { span: 1, chartHeight: chartHeight(), chartMinWidth: categoricalChartWidth(collectionLength(data.x), 68, 8) };
  if (visualization?.type === "heatmap") return { span: 1, chartHeight: chartHeight(), chartMinWidth: categoricalChartWidth(collectionLength(data.columns), 84, 5) };
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
