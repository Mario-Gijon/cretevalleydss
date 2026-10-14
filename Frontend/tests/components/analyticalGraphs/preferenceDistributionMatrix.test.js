import { describe, expect, it } from "vitest";

import {
  buildPreferenceDistributionDatasets,
  getPreferenceDistributionClusterOffsets,
  getPreferenceDistributionMetrics,
  isIndividualPreferenceDistribution,
  PREFERENCE_DISTRIBUTION_CLUSTER_SPACING_PX,
  PREFERENCE_DISTRIBUTION_MARKER_DIAMETER_PX,
} from "../../../src/components/analyticalGraphs/logic/preferenceDistributionMatrix.js";
import { preferenceDistributionMatrixPlugin } from "../../../src/components/analyticalGraphs/logic/preferenceDistributionMatrixPlugin.js";

const expertSeries = (key, x = 2, y = 1) => ({
  key,
  label: key,
  points: [{ id: `${key}:criterion-1`, x, y, details: { expert: key, criterion: "Cost", rank: x, utility: 0.5 } }],
});

const chartDatasets = (series) => buildPreferenceDistributionDatasets(series).map((item) => ({
  label: item.label,
  expertKey: item.expertKey,
  data: item.points,
}));

const offsetsByExpert = (series) => {
  const datasets = chartDatasets(series);
  const offsets = getPreferenceDistributionClusterOffsets(datasets);
  return Object.fromEntries(datasets.map((dataset, index) => [dataset.expertKey, offsets.get(`${index}:0`)]));
};

describe("preferenceDistributionMatrix", () => {
  it("opts in only for the individual preference distribution scatter descriptor", () => {
    expect(isIndividualPreferenceDistribution({ key: "individual-preference-distribution", type: "scatter" })).toBe(true);
    expect(isIndividualPreferenceDistribution({ key: "other-scatter", type: "scatter" })).toBe(false);
    expect(isIndividualPreferenceDistribution({ key: "individual-preference-distribution", type: "line" })).toBe(false);
  });

  it("keeps two matching experts on the same criterion row and centers their horizontal offsets", () => {
    const source = [expertSeries("bruno"), expertSeries("carla")];
    const datasets = chartDatasets(source);
    const offsets = getPreferenceDistributionClusterOffsets(datasets);

    expect(datasets.map((dataset) => dataset.data[0])).toEqual(expect.arrayContaining([
      expect.objectContaining({ x: 2, y: 1, expertKey: "bruno" }),
      expect.objectContaining({ x: 2, y: 1, expertKey: "carla" }),
    ]));
    expect(offsets.get("0:0")).toBe(-3.5);
    expect(offsets.get("1:0")).toBe(3.5);
  });

  it.each([3, 4, 5, 9])("places %i colliding experts on one line with deterministic partial overlap", (count) => {
    const series = Array.from({ length: count }, (_, index) => expertSeries(`expert-${String(index).padStart(2, "0")}`));
    const offsets = Object.values(offsetsByExpert(series));

    expect(offsets).toEqual(Array.from({ length: count }, (_, index) => (index - (count - 1) / 2) * PREFERENCE_DISTRIBUTION_CLUSTER_SPACING_PX));
    expect(offsets.reduce((sum, value) => sum + value, 0)).toBeCloseTo(0);
    expect(new Set(offsets).size).toBe(count);
    expect(PREFERENCE_DISTRIBUTION_CLUSTER_SPACING_PX / PREFERENCE_DISTRIBUTION_MARKER_DIAMETER_PX).toBeCloseTo(0.64);
  });

  it("applies a five-expert cluster horizontally while keeping every rendered Y coordinate fixed", () => {
    const datasets = chartDatasets(Array.from({ length: 5 }, (_, index) => expertSeries(`expert-${index}`)));
    const elements = datasets.map((dataset) => dataset.data.map((point) => ({ x: 0, y: point.y })));
    const chart = {
      data: { datasets },
      scales: { x: { getPixelForValue: () => 240 } },
      getDatasetMeta: (datasetIndex) => ({ data: elements[datasetIndex] }),
    };

    preferenceDistributionMatrixPlugin.afterDatasetsUpdate(chart, {}, { enabled: true });

    expect(elements.map((dataset) => dataset[0].x)).toEqual([226, 233, 240, 247, 254]);
    expect(elements.map((dataset) => dataset[0].y)).toEqual([1, 1, 1, 1, 1]);
    expect(datasets.map((dataset) => dataset.data[0].x)).toEqual([2, 2, 2, 2, 2]);
  });

  it("uses stable expert identifiers when series order changes", () => {
    const source = [expertSeries("bruno"), expertSeries("carla"), expertSeries("ana")];
    const reordered = [source[2], source[0], source[1]];

    expect(offsetsByExpert(source)).toEqual(offsetsByExpert(reordered));
  });

  it("preserves source rank, criterion, utility, and source objects", () => {
    const source = [expertSeries("a"), expertSeries("b"), expertSeries("c", 3, 2)];
    const rendered = buildPreferenceDistributionDatasets(source);

    expect(rendered.map((entry) => entry.points[0])).toEqual(expect.arrayContaining([
      expect.objectContaining({ x: 2, y: 1, details: expect.objectContaining({ rank: 2, utility: 0.5 }) }),
      expect.objectContaining({ x: 3, y: 2, details: expect.objectContaining({ rank: 3, utility: 0.5 }) }),
    ]));
    expect(source[0].points[0]).toEqual(expect.objectContaining({ x: 2, y: 1 }));
  });

  it("does not cluster experts in different criterion-rank cells", () => {
    const series = [expertSeries("a"), expertSeries("b"), expertSeries("c", 3), expertSeries("d", 2, 2)];
    const offsets = getPreferenceDistributionClusterOffsets(chartDatasets(series));

    expect(offsets.get("0:0")).toBe(-3.5);
    expect(offsets.get("1:0")).toBe(3.5);
    expect(offsets.get("2:0")).toBe(0);
    expect(offsets.get("3:0")).toBe(0);
  });

  it("handles a single expert and sizes rank cells for heavy collisions", () => {
    const single = [expertSeries("solo")];
    expect(getPreferenceDistributionClusterOffsets(chartDatasets(single)).get("0:0")).toBe(0);

    const descriptor = {
      key: "individual-preference-distribution",
      type: "scatter",
      xAxis: { min: 1, max: 7 },
      yAxis: { categories: [{ value: 1, label: "Local Socio-Economic Benefits" }] },
      data: { series: Array.from({ length: 20 }, (_, index) => expertSeries(`expert-${index}`)) },
    };
    const metrics = getPreferenceDistributionMetrics(descriptor);
    expect(metrics.rankCount).toBe(7);
    expect(metrics.criterionCount).toBe(1);
    expect(metrics.largestCollisionGroup).toBe(20);
    expect(metrics.chartMinWidth).toBeGreaterThan(7 * 72);
  });
});
