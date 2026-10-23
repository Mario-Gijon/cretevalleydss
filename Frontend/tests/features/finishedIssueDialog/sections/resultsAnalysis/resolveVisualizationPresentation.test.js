import { describe, expect, it } from "vitest";

import {
  filterSensitivityVisualization,
  getSensitivityAlternativeOptions,
  recommendSensitivityAlternativeIds,
  resolveVisualizationPresentation,
} from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/resolveVisualizationPresentation.js";

const item = (key, label, categories) => ({
  key,
  label,
  role: "alternative",
  values: categories.map((category, index) => ({
    x: [0.4, 0.48, 0.6, 0.9][index],
    y: 0.7 - index * 0.1,
    isConfiguredWeight: index === 1,
    details: { Category: category },
  })),
});

describe("criterion weight sensitivity presentation", () => {
  it("recommends up to three alternatives with observed category changes nearest the configured weight", () => {
    const visualization = {
      data: {
        configuredWeight: 0.48,
        series: [
          item("far-change", "Far change", ["Low", "Low", "Low", "High"]),
          item("near-change", "Near change", ["Low", "High", "High", "High"]),
          item("middle-change", "Middle change", ["Low", "Low", "High", "High"]),
          item("no-change", "No change", ["Medium", "Medium", "Medium", "Medium"]),
          { key: "profile-p1", label: "Low / Medium", role: "boundary", values: [] },
        ],
      },
    };

    expect(recommendSensitivityAlternativeIds(visualization, 3)).toEqual([
      "near-change",
      "middle-change",
      "far-change",
    ]);
    expect(recommendSensitivityAlternativeIds({
      data: { configuredWeight: 0.48, series: [item("z", "Zulu", ["A", "A", "A", "A"]), item("a", "Alpha", ["A", "A", "A", "A"])] },
    }, 3)).toEqual(["a", "z"]);
  });

  it("keeps every alternative available and filters only the visual projection while retaining all boundaries", () => {
    const visualization = {
      data: { series: [
        item("alternative-a", "A", ["High", "High", "High", "High"]),
        item("alternative-b", "B", ["Low", "Low", "Low", "Low"]),
        { key: "profile-p1", label: "Boundary 1", role: "boundary", values: [null] },
        { key: "profile-p2", label: "Boundary 2", role: "boundary", values: [null] },
      ] },
    };

    expect(getSensitivityAlternativeOptions([visualization]).map(({ id }) => id)).toEqual(["alternative-a", "alternative-b"]);
    const filtered = filterSensitivityVisualization(visualization, ["alternative-b"]);
    expect(filtered.data.series.map(({ key }) => key)).toEqual(["alternative-b", "profile-p1", "profile-p2"]);
    expect(visualization.data.series).toHaveLength(4);
  });

  it("applies generic presentation metadata and keeps old TOPSIS-Sort descriptors usable", () => {
    expect(resolveVisualizationPresentation({
      key: "topsis-sort-criterion-weight-sensitivity-price",
    })).toMatchObject({
      chartHeight: { xs: 420, sm: 500, md: 580 },
      compactLegend: true,
      stableSeriesColors: true,
      alternativeSelector: { recommendedCount: 3 },
    });
    expect(resolveVisualizationPresentation({
      key: "other-line",
      presentation: { chartHeight: { xs: 390 }, compactLegend: true },
    })).toMatchObject({ chartHeight: { xs: 390 }, compactLegend: true });
    expect(resolveVisualizationPresentation({ key: "other-line" }).alternativeSelector).toBeUndefined();
  });
});
