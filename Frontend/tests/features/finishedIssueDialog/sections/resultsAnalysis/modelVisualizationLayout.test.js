import { describe, expect, it } from "vitest";

import { buildVisualizationLayout, getVisualizationLayout } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/modelVisualizationLayout.js";

describe("getVisualizationLayout", () => {
  it("assigns non-dense graph types a compact preferred span", () => {
    expect(getVisualizationLayout({ type: "pie" })).toMatchObject({ span: 1, chartHeight: { sm: 320 } });
    expect(getVisualizationLayout({ type: "radar" })).toMatchObject({ span: 1, chartHeight: { sm: 320 } });
    expect(getVisualizationLayout({ type: "scatter" })).toMatchObject({ span: 1, chartHeight: { sm: 320 } });
  });

  it("grows horizontal bars vertically without a category-count-driven minimum width", () => {
    const layout = getVisualizationLayout({
      type: "bar",
      orientation: "horizontal",
      data: { categories: Array.from({ length: 18 }, (_, index) => index) },
    });

    expect(layout).toEqual({ span: 1, chartHeight: { xs: 680, sm: 680 } });
    expect(layout.chartMinWidth).toBeUndefined();
  });

  it("keeps vertical bars compact while assigning dense categories an internal minimum width", () => {
    expect(getVisualizationLayout({ type: "bar", data: { categories: ["a", "b"] } })).toMatchObject({ span: 1 });
    expect(getVisualizationLayout({ type: "bar", data: { categories: Array.from({ length: 10 }, (_, index) => index) } })).toEqual({ span: 1, chartHeight: { xs: 300, sm: 320 }, chartMinWidth: 720 });
  });

  it("grows heatmaps by rows while retaining column-driven minimum width", () => {
    expect(getVisualizationLayout({
      type: "heatmap",
      data: {
        rows: Array.from({ length: 18 }, (_, index) => index),
        columns: Array.from({ length: 18 }, (_, index) => index),
      },
    })).toEqual({ span: 1, chartHeight: { xs: 736, sm: 736 }, chartMinWidth: 1512 });
  });

  it("caps dynamic horizontal-bar and heatmap heights", () => {
    expect(getVisualizationLayout({
      type: "bar",
      orientation: "horizontal",
      data: { categories: Array.from({ length: 100 }, (_, index) => index) },
    }).chartHeight).toEqual({ xs: 800, sm: 800 });
    expect(getVisualizationLayout({
      type: "heatmap",
      data: { rows: Array.from({ length: 100 }, (_, index) => index) },
    }).chartHeight).toEqual({ xs: 800, sm: 800 });
  });

  it("keeps line charts compact with their existing dense-point minimum width", () => {
    expect(getVisualizationLayout({ type: "line", data: { x: Array.from({ length: 10 }, (_, index) => index) } })).toEqual({ span: 1, chartHeight: { xs: 300, sm: 320 }, chartMinWidth: 680 });
  });

  it("keeps even compact-card rows complete and preserves descriptor order", () => {
    const descriptors = [{ key: "pie", type: "pie" }, { key: "radar", type: "radar" }, { key: "scatter", type: "scatter" }, { key: "last", type: "pie" }];
    const layout = buildVisualizationLayout(descriptors);
    expect(layout.map((entry) => entry.visualization.key)).toEqual(["pie", "radar", "scatter", "last"]);
    expect(layout.map((entry) => entry.span)).toEqual([1, 1, 1, 1]);
  });

  it("promotes only an unpaired final compact card", () => {
    const layout = buildVisualizationLayout([{ key: "pie", type: "pie" }, { key: "scatter", type: "scatter" }, { key: "radar", type: "radar" }]);
    expect(layout.map((entry) => entry.span)).toEqual([1, 1, 2]);
  });

  it("uses a safe compact fallback for malformed or unknown descriptors", () => {
    expect(getVisualizationLayout(null)).toEqual({ span: 1, chartHeight: { xs: 300, sm: 320 } });
    expect(buildVisualizationLayout([null]).map((entry) => entry.span)).toEqual([2]);
  });
});
