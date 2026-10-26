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

  it("does not interpret an indeterminate boundary sample as a category change", () => {
    const tied = item("district-21", "District 21", ["High", "High", "High", "High"]);
    tied.values[2] = {
      x: 0.6,
      y: 0.5208,
      details: {
        Weight: 0.6,
        "Relative closeness coefficient": 0.5208,
        "Category status": "Undetermined — exactly on a boundary",
      },
    };
    const visualization = {
      data: {
        configuredWeight: 0.48,
        series: [
          tied,
          item("actual-change", "Actual change", ["Low", "High", "Low", "High"]),
        ],
      },
    };

    expect(recommendSensitivityAlternativeIds(visualization, 1)).toEqual(["actual-change"]);
    expect(getSensitivityAlternativeOptions([visualization]).map(({ id }) => id)).toContain("district-21");
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

  it("uses short stable disambiguators for duplicate names without exposing internal IDs", () => {
    const options = getSensitivityAlternativeOptions([{
      data: { series: [
        item("6adb3911d0553d472971bda0", "Same option", ["High", "High", "High", "High"]),
        item("6adb3911d0553d472971bd99", "Same option", ["Low", "Low", "Low", "Low"]),
        item("other-id", "Named option", ["Low", "Low", "Low", "Low"]),
      ] },
    }]);

    expect(options).toEqual([
      { id: "other-id", label: "Named option", displayLabel: "Named option" },
      { id: "6adb3911d0553d472971bd99", label: "Same option", displayLabel: "Same option (1)" },
      { id: "6adb3911d0553d472971bda0", label: "Same option", displayLabel: "Same option (2)" },
    ]);
    expect(options.map(({ displayLabel }) => displayLabel).join(" ")).not.toContain("6adb3911d0553d472971");
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
    expect(resolveVisualizationPresentation({
      key: "topsis-sort-closeness-category-boundaries",
    })).toMatchObject({
      tooltip: { variant: "closeness-boundaries", precision: 4 },
      referenceLines: { interactive: false },
    });
  });
});
