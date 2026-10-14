export const INDIVIDUAL_PREFERENCE_DISTRIBUTION_KEY = "individual-preference-distribution";

export const PREFERENCE_DISTRIBUTION_MARKER_DIAMETER_PX = 11;
export const PREFERENCE_DISTRIBUTION_CLUSTER_SPACING_PX = 7;
export const PREFERENCE_DISTRIBUTION_MIN_CELL_WIDTH_PX = 72;
export const PREFERENCE_DISTRIBUTION_CELL_PADDING_PX = 8;
export const PREFERENCE_DISTRIBUTION_AXIS_GUTTER_PX = 80;

const validSeriesPoints = (series) => (Array.isArray(series) ? series : []).flatMap((item, datasetIndex) =>
  (Array.isArray(item?.points) ? item.points : [])
    .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
    .map((point) => ({
      point,
      expertKey: String(item?.key ?? point.id ?? item?.label ?? datasetIndex),
    }))
);

const cellKey = (x, y) => JSON.stringify([x, y]);

export const isIndividualPreferenceDistribution = (visualization) =>
  visualization?.type === "scatter" && visualization?.key === INDIVIDUAL_PREFERENCE_DISTRIBUTION_KEY;

export const buildPreferenceDistributionDatasets = (series) => (Array.isArray(series) ? series : []).map((item, datasetIndex) => {
  const expertKey = String(item?.key ?? item?.label ?? datasetIndex);
  return {
    ...item,
    expertKey,
    points: (Array.isArray(item?.points) ? item.points : [])
      .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
      .map((point) => ({ ...point, x: point.x, y: point.y, expertKey })),
  };
});

export const getPreferenceDistributionClusterOffsets = (
  datasets,
  clusterSpacingPx = PREFERENCE_DISTRIBUTION_CLUSTER_SPACING_PX
) => {
  const groups = new Map();
  (Array.isArray(datasets) ? datasets : []).forEach((dataset, datasetIndex) => {
    (Array.isArray(dataset?.data) ? dataset.data : []).forEach((point, dataIndex) => {
      if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return;
      const key = cellKey(point.x, point.y);
      const group = groups.get(key) || [];
      group.push({
        datasetIndex,
        dataIndex,
        expertKey: String(dataset.expertKey ?? point.expertKey ?? dataset.label ?? datasetIndex),
        pointId: String(point.id ?? ""),
      });
      groups.set(key, group);
    });
  });

  const offsets = new Map();
  groups.forEach((group) => {
    group.sort((a, b) => a.expertKey < b.expertKey
      ? -1
      : a.expertKey > b.expertKey
        ? 1
        : a.pointId < b.pointId
          ? -1
          : a.pointId > b.pointId
            ? 1
            : 0);
    group.forEach(({ datasetIndex, dataIndex }, index) => {
      offsets.set(`${datasetIndex}:${dataIndex}`, (index - (group.length - 1) / 2) * clusterSpacingPx);
    });
  });
  return offsets;
};

const categoryCount = (visualization, points) => {
  const categories = visualization?.yAxis?.categories;
  return Array.isArray(categories) && categories.length
    ? categories.length
    : new Set(points.map(({ point }) => point.y)).size;
};

export const getPreferenceDistributionMetrics = (visualization) => {
  const points = validSeriesPoints(visualization?.data?.series);
  const cellCounts = new Map();
  points.forEach(({ point }) => {
    const key = cellKey(point.x, point.y);
    cellCounts.set(key, (cellCounts.get(key) || 0) + 1);
  });
  const largestCollisionGroup = Math.max(1, ...cellCounts.values());
  const xValues = points.map(({ point }) => point.x);
  const minRank = Number.isFinite(visualization?.xAxis?.min) ? visualization.xAxis.min : Math.min(...xValues, 1);
  const maxRank = Number.isFinite(visualization?.xAxis?.max) ? visualization.xAxis.max : Math.max(...xValues, minRank);
  const rankCount = Math.max(1, Math.floor(maxRank - minRank + 1));
  const criterionTotal = categoryCount(visualization, points);
  const longestCriterionLabel = Math.max(0, ...(visualization?.yAxis?.categories || []).map((category) => String(category?.label || "").length));
  const criterionLabelGutter = Math.max(PREFERENCE_DISTRIBUTION_AXIS_GUTTER_PX, longestCriterionLabel * 7 + 52);
  const clusterWidth = PREFERENCE_DISTRIBUTION_MARKER_DIAMETER_PX
    + Math.max(0, largestCollisionGroup - 1) * PREFERENCE_DISTRIBUTION_CLUSTER_SPACING_PX
    + PREFERENCE_DISTRIBUTION_CELL_PADDING_PX * 2;
  const cellWidth = Math.max(PREFERENCE_DISTRIBUTION_MIN_CELL_WIDTH_PX, clusterWidth);

  return {
    criterionCount: criterionTotal,
    rankCount,
    largestCollisionGroup,
    cellWidth,
    chartMinWidth: criterionLabelGutter + rankCount * cellWidth,
  };
};
