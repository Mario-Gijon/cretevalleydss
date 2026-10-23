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

  it.each([3, 7, 15])("gives MCC adjustment maps 150px criteria columns for %i criteria", (columnCount) => {
    const layout = getVisualizationLayout({
      key: "mcc-adjustment-map",
      type: "heatmap",
      data: {
        rows: Array.from({ length: 7 }, (_, index) => index),
        columns: Array.from({ length: columnCount }, (_, index) => index),
      },
    });

    expect(layout.chartMinWidth).toBe(180 + columnCount * 154);
  });

  it.each([
    ["two-tuple-collective-profile", 5],
    ["two-tuple-collective-profile", 13],
    ["two-tuple-collective-profile", 18],
    ["two-tuple-alpha-heatmap", 5],
    ["two-tuple-alpha-heatmap", 13],
    ["two-tuple-alpha-heatmap", 18],
    ["collective-beta-heatmap", 5],
    ["collective-beta-heatmap", 13],
    ["collective-beta-heatmap", 18],
    ["alpha-heatmap", 5],
    ["alpha-heatmap", 13],
    ["alpha-heatmap", 18],
  ])("gives %s a 240px label column and readable criterion columns for %i criteria", (key, columnCount) => {
    expect(getVisualizationLayout({
      key,
      type: "heatmap",
      data: { columns: Array.from({ length: columnCount }, (_, index) => index) },
    }).chartMinWidth).toBe(240 + columnCount * 154);
  });

  it.each([3, 7, 15])("gives TOPSIS collective performance a scrollable matrix for %i criteria", (columnCount) => {
    expect(getVisualizationLayout({
      key: "topsis-collective-performance-profile",
      type: "heatmap",
      data: { columns: Array.from({ length: columnCount }, (_, index) => index) },
    }).chartMinWidth).toBe(240 + columnCount * 154);
  });

  it("keeps unrelated heatmap sizing unchanged", () => {
    expect(getVisualizationLayout({
      key: "generic-heatmap",
      type: "heatmap",
      data: { columns: Array.from({ length: 7 }, (_, index) => index) },
    }).chartMinWidth).toBe(588);
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

  it("keeps continuous numeric sensitivity lines full-width and uses descriptor-specific responsive height", () => {
    expect(getVisualizationLayout({
      key: "topsis-sort-criterion-weight-sensitivity-sustainability",
      type: "line",
      data: { xScaleType: "linear", x: Array.from({ length: 21 }, (_, index) => index / 20) },
    })).toEqual({ span: 1, chartHeight: { xs: 420, sm: 500, md: 580 } });
    expect(getVisualizationLayout({
      type: "line",
      data: { xScaleType: "linear", x: Array.from({ length: 21 }, (_, index) => index / 20) },
    })).toEqual({ span: 1, chartHeight: { xs: 300, sm: 320 } });
  });

  it("preserves dense categorical line spacing for existing models", () => {
    expect(getVisualizationLayout({
      type: "line",
      data: { x: Array.from({ length: 10 }, (_, index) => `Round ${index + 1}`) },
    })).toEqual({ span: 1, chartHeight: { xs: 300, sm: 320 }, chartMinWidth: 680 });
  });

  it("reserves horizontal rank-cell width only for the individual preference distribution", () => {
    const descriptor = (expertCount) => ({
      key: "individual-preference-distribution",
      type: "scatter",
      xAxis: { min: 1, max: 7 },
      yAxis: { categories: Array.from({ length: 7 }, (_, index) => ({ value: index + 1, label: `Criterion ${index + 1}` })) },
      data: { series: Array.from({ length: expertCount }, (_, index) => ({ key: `expert-${index}`, points: [{ x: 2, y: 1 }] })) },
    });

    const twoExperts = getVisualizationLayout(descriptor(2));
    const heavyCollision = getVisualizationLayout(descriptor(20));
    expect(twoExperts.chartHeight).toEqual({ xs: 300, sm: 320 });
    expect(heavyCollision.chartHeight).toEqual({ xs: 300, sm: 320 });
    expect(heavyCollision.chartMinWidth).toBeGreaterThan(twoExperts.chartMinWidth);
    expect(getVisualizationLayout({ key: "another-scatter", type: "scatter" }).chartHeight).toEqual({ xs: 300, sm: 320 });
  });

  it("keeps many alternative rows readable and reserves width for long alternative names", () => {
    const categories = Array.from({ length: 50 }, (_, index) => ({
      value: index,
      label: `Alternative ${index}: a long environmental restoration proposal name`,
    }));
    const layout = getVisualizationLayout({
      type: "scatter",
      yAxis: { categories },
    });

    expect(layout.chartHeight).toEqual({ xs: 1532, sm: 1532 });
    expect(layout.chartMinWidth).toBeGreaterThan(600);
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
