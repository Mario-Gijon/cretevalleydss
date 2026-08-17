import { describe, expect, it } from "vitest";

import { buildVisualizationLayout, getVisualizationLayout } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/modelVisualizationLayout.js";

describe("getVisualizationLayout", () => {
  it("assigns every graph type a compact preferred span", () => {
    expect(getVisualizationLayout({ type: "pie" })).toMatchObject({ span: 1, chartHeight: { sm: 320 } });
    expect(getVisualizationLayout({ type: "radar" })).toMatchObject({ span: 1, chartHeight: { sm: 320 } });
    expect(getVisualizationLayout({ type: "scatter" })).toMatchObject({ span: 1, chartHeight: { sm: 320 } });
    expect(getVisualizationLayout({ type: "heatmap" })).toMatchObject({ span: 1, chartHeight: { sm: 320 } });
  });

  it("keeps dense categorical charts compact while assigning an internal minimum width", () => {
    expect(getVisualizationLayout({ type: "bar", data: { categories: ["a", "b"] } })).toMatchObject({ span: 1 });
    expect(getVisualizationLayout({ type: "bar", data: { categories: Array.from({ length: 10 }, (_, index) => index) } })).toEqual({ span: 1, chartHeight: { xs: 300, sm: 320 }, chartMinWidth: 720 });
    expect(getVisualizationLayout({ type: "line", data: { x: Array.from({ length: 10 }, (_, index) => index) } })).toMatchObject({ span: 1, chartMinWidth: 680 });
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
