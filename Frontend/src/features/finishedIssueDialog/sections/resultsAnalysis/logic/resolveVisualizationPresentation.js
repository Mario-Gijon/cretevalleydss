const TOPSIS_SORT_SENSITIVITY_PREFIX = "topsis-sort-criterion-weight-sensitivity-";

const LEGACY_TOPSIS_SORT_SENSITIVITY_PRESENTATION = Object.freeze({
  chartHeight: Object.freeze({ xs: 420, sm: 500, md: 580 }),
  stableSeriesColors: true,
  compactLegend: true,
  originalWeightMarker: true,
  showUnavailableSamples: true,
  alternativeSelector: Object.freeze({ recommendedCount: 3 }),
  methodDetails: "Other criterion weights are redistributed proportionally. TOPSIS-Sort is recomputed at each discrete sample; sampled changes identify an interval, not an exact threshold. Mathematically unavailable scenarios remain blank.",
});

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Presentation metadata is optional so older persisted descriptors remain renderable.
 * The legacy key fallback upgrades historical TOPSIS-Sort sensitivity descriptors
 * without changing their stored analytical evidence.
 */
export const resolveVisualizationPresentation = (visualization) => {
  const key = typeof visualization?.key === "string" ? visualization.key : "";
  const legacy = key.startsWith(TOPSIS_SORT_SENSITIVITY_PREFIX)
    ? LEGACY_TOPSIS_SORT_SENSITIVITY_PRESENTATION
    : {};
  return {
    ...legacy,
    ...(isRecord(visualization?.presentation) ? visualization.presentation : {}),
  };
};

export const isAlternativeSensitivitySeries = (series) => {
  if (series?.role === "alternative") return true;
  if (series?.role === "boundary") return false;
  return !(typeof series?.key === "string" && series.key.startsWith("profile-"));
};

const seriesId = (series) => typeof series?.key === "string" && series.key.trim()
  ? series.key.trim()
  : null;

export const getSensitivityAlternativeOptions = (visualizations) => {
  const optionsById = new Map();
  (Array.isArray(visualizations) ? visualizations : []).forEach((visualization) => {
    (Array.isArray(visualization?.data?.series) ? visualization.data.series : []).forEach((series) => {
      const id = seriesId(series);
      if (!id || !isAlternativeSensitivitySeries(series) || optionsById.has(id)) return;
      const label = typeof series.label === "string" && series.label.trim() ? series.label.trim() : id;
      optionsById.set(id, { id, label });
    });
  });
  return [...optionsById.values()].sort((left, right) =>
    left.label.localeCompare(right.label, "en") || left.id.localeCompare(right.id, "en"));
};

const categoryAt = (point) => {
  const category = point?.details?.Category ?? point?.category;
  return typeof category === "string" && category.trim() ? category : null;
};

const pointWeight = (point) => {
  const weight = point?.x ?? point?.details?.Weight;
  return Number.isFinite(weight) ? weight : null;
};

const recommendationForSeries = (series, configuredWeight) => {
  const values = Array.isArray(series?.values) ? series.values : [];
  const baseline = values.find((point) => point?.isConfiguredWeight === true)
    || values.find((point) => pointWeight(point) === configuredWeight);
  const baselineCategory = categoryAt(baseline);
  let nearestChange = Number.POSITIVE_INFINITY;
  if (baselineCategory) {
    values.forEach((point) => {
      const category = categoryAt(point);
      const weight = pointWeight(point);
      if (point?.y === null || !Number.isFinite(point?.y) || !category || category === baselineCategory || weight === null) return;
      nearestChange = Math.min(nearestChange, Math.abs(weight - configuredWeight));
    });
  }
  return {
    id: seriesId(series),
    hasCategoryChange: Number.isFinite(nearestChange),
    nearestChange,
  };
};

export const recommendSensitivityAlternativeIds = (visualization, maximum = 3) => {
  const series = (Array.isArray(visualization?.data?.series) ? visualization.data.series : [])
    .filter(isAlternativeSensitivitySeries);
  const configuredWeight = visualization?.data?.configuredWeight;
  return series
    .map((item) => recommendationForSeries(item, configuredWeight))
    .filter((item) => item.id)
    .sort((left, right) =>
      Number(right.hasCategoryChange) - Number(left.hasCategoryChange)
      || left.nearestChange - right.nearestChange
      || left.id.localeCompare(right.id, "en"))
    .slice(0, Math.max(0, Number.isInteger(maximum) ? maximum : 3))
    .map((item) => item.id);
};

export const filterSensitivityVisualization = (visualization, selectedIds) => {
  if (!Array.isArray(selectedIds) || !Array.isArray(visualization?.data?.series)) return visualization;
  const selected = new Set(selectedIds);
  return {
    ...visualization,
    data: {
      ...visualization.data,
      series: visualization.data.series.filter((series) =>
        !isAlternativeSensitivitySeries(series) || selected.has(seriesId(series))),
    },
  };
};
