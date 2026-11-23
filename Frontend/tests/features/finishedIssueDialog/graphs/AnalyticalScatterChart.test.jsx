import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const scatterState = vi.hoisted(() => ({ data: null, options: null }));

vi.mock("react-chartjs-2", () => ({
  Scatter: ({ data, options }) => {
    scatterState.data = data;
    scatterState.options = options;
    return <div data-testid="scatter" />;
  },
}));

import { AnalyticalScatterChart } from "../../../../src/features/finishedIssueDialog/graphs/components/AnalyticalScatterChart.jsx";

describe("AnalyticalScatterChart", () => {
  it("keeps coincident expert and collective coordinates while drawing distinct markers", () => {
    render(
      <AnalyticalScatterChart
        phase={0}
        color="#27d5e4"
        data={{
          0: {
            expertPoints: [{ x: 0, y: 0, label: "Adrian Popescu" }],
            collectivePoint: { x: 0, y: 0 },
          },
        }}
      />
    );

    const [experts, collective] = scatterState.data.datasets;
    expect(experts.data).toEqual([
      expect.objectContaining({ x: 0, y: 0, email: "Adrian Popescu" }),
    ]);
    expect(collective.data).toEqual([
      expect.objectContaining({ x: 0, y: 0 }),
    ]);
    expect(experts.pointStyle).toBeUndefined();
    expect(experts.pointRadius).toBe(8);
    expect(experts.expertCollectiveRole).toBe("experts");
    expect(collective.pointStyle).toBe("rectRot");
    expect(collective.pointRadius).toBe(10);
    expect(collective.borderWidth).toBe(2);
    expect(scatterState.options.plugins.zoom).toBeUndefined();
    expect(scatterState.options.scales.x.min).toBe(-1);
    expect(scatterState.options.scales.x.max).toBe(1);
    expect(scatterState.options.scales.y.min).toBe(-1);
    expect(scatterState.options.scales.y.max).toBe(1);
    expect(scatterState.options.plugins.tooltip.callbacks.label({ datasetIndex: 0, raw: experts.data[0] }).join(" ")).toContain("Adrian Popescu");
    expect(scatterState.options.plugins.tooltip.mode).toBe("point");
    expect(screen.getByTestId("expert-collective-overlap-note").textContent).toContain("does not establish");
  });

  it("disambiguates duplicate expert labels with the stable email identity in tooltips", () => {
    render(
      <AnalyticalScatterChart
        phase={0}
        color="#27d5e4"
        data={{
          0: {
            expertPoints: [
              { x: -1, y: 0, label: "Shared name", identity: "expert-1", email: "one@example.test" },
              { x: 1, y: 0, label: "Shared name", identity: "expert-2", email: "two@example.test" },
            ],
            collectivePoint: { x: 0, y: 0 },
          },
        }}
      />
    );

    const [experts] = scatterState.data.datasets;
    const tooltipLabel = scatterState.options.plugins.tooltip.callbacks.label({
      datasetIndex: 0,
      raw: experts.data[0],
    });

    expect(tooltipLabel.join(" ")).toContain("Shared name");
    expect(tooltipLabel.join(" ")).toContain("one@example.test");
  });

  it("groups coincident experts at their original coordinates and identifies both with the collective", () => {
    render(
      <AnalyticalScatterChart
        phase={0}
        color="#27d5e4"
        data={{
          0: {
            expertPoints: [
              { x: 0, y: 0, label: "Shared name", identity: "expert-1", email: "one@example.test" },
              { x: 0, y: 0, label: "Shared name", identity: "expert-2", email: "two@example.test" },
            ],
            collectivePoint: { x: 0, y: 0 },
            hasEvaluationEqualityEvidence: true,
            identicalEvaluationGroups: [["expert-1", "expert-2"]],
            collectiveIdenticalExpertIds: ["expert-1", "expert-2"],
          },
        }}
      />
    );

    const [experts, collective] = scatterState.data.datasets;
    expect(experts.data).toHaveLength(1);
    expect(experts.data[0]).toMatchObject({ x: 0, y: 0, expertCount: 2 });
    expect(experts.data[0].experts).toHaveLength(2);
    expect(collective.data[0]).toMatchObject({ x: 0, y: 0 });

    const expertTooltip = scatterState.options.plugins.tooltip.callbacks.label({
      datasetIndex: 0,
      raw: experts.data[0],
    });
    expect(expertTooltip.join(" ")).toContain("one@example.test");
    expect(expertTooltip.join(" ")).toContain("two@example.test");
    expect(screen.getByTestId("expert-collective-overlap-note").textContent).toContain("numeric matrices used for the projection");
    expect(screen.getByTestId("expert-collective-overlap-note").textContent).toContain("collective");
  });

  it("renders categorical expert and collective overlaps with shared markers and no numeric connectors", () => {
    render(
      <AnalyticalScatterChart
        phase={0}
        color="#27d5e4"
        variant="categorical"
        data={{
          0: {
            projectionSemantics: "categorical-pattern",
            expertPoints: [
              { x: 0.25, y: -0.5, label: "Aster North Supply", identity: "expert-aster", details: { exactCategoryMatches: 3, totalAlternatives: 5 } },
              { x: 0.25, y: -0.5, label: "Boreal Industrial Group", identity: "expert-boreal", details: { exactCategoryMatches: 4, totalAlternatives: 5 } },
              { x: 0.25, y: -0.5, label: "Cygnus Manufacturing Ltd", identity: "expert-cygnus", details: { exactCategoryMatches: 5, totalAlternatives: 5 } },
            ],
            collectivePoint: { x: 0.25, y: -0.5, label: "Collective result" },
          },
        }}
      />
    );

    const [experts, collective] = scatterState.data.datasets;
    expect(experts.data).toHaveLength(1);
    expect(experts.data[0]).toMatchObject({ x: 0.25, y: -0.5, expertCount: 3 });
    expect(experts.pointStyle).toBe("circle");
    expect(collective.label).toBe("Collective result");
    expect(collective.pointStyle).toBe("rectRot");
    expect(collective.pointRadius).toBeGreaterThan(experts.pointRadius);
    expect(collective.borderWidth).toBeGreaterThan(2);
    expect(collective.backgroundColor).not.toBe(experts.backgroundColor);
    expect(scatterState.options.plugins.expertCollectiveConnectors.groups[0].connectors).toEqual([]);

    const expertTooltip = scatterState.options.plugins.tooltip.callbacks.label({ datasetIndex: 0, raw: experts.data[0] });
    expect(expertTooltip).toHaveLength(3);
    expect(expertTooltip.join(" ")).toContain("Aster North Supply");
    expect(expertTooltip.join(" ")).toContain("Boreal Industrial Group");
    expect(expertTooltip.join(" ")).toContain("Cygnus Manufacturing Ltd");
    expect(expertTooltip.join(" ")).toContain("exact category matches to the collective");
    expect(scatterState.options.plugins.tooltip.callbacks.label({ datasetIndex: 1, raw: collective.data[0] })).toContain("Collective result");

    const overlapNote = screen.getByTestId("expert-collective-overlap-note").textContent;
    expect(overlapNote).toContain("Aster North Supply");
    expect(overlapNote).toContain("Boreal Industrial Group");
    expect(overlapNote).toContain("Cygnus Manufacturing Ltd");
    expect(overlapNote).toContain("the collective");
    expect(overlapNote).toContain("does not establish identical classification patterns");
    expect(overlapNote).not.toContain("numeric matrix");
  });

  it("shows nearby stored coordinates at round-trip precision instead of making them look equal", () => {
    render(
      <AnalyticalScatterChart
        phase={0}
        color="#27d5e4"
        data={{
          0: {
            expertPoints: [
              { x: 1.23451, y: 0, label: "Expert One", identity: "expert-1" },
              { x: 1.23452, y: 0, label: "Expert Two", identity: "expert-2" },
            ],
            collectivePoint: { x: 3, y: 1 },
          },
        }}
      />
    );

    const [experts] = scatterState.data.datasets;
    expect(experts.data).toHaveLength(2);
    const first = scatterState.options.plugins.tooltip.callbacks.label({ datasetIndex: 0, raw: experts.data[0] })[0];
    const second = scatterState.options.plugins.tooltip.callbacks.label({ datasetIndex: 0, raw: experts.data[1] })[0];
    expect(first).toContain("1.23451");
    expect(second).toContain("1.23452");
    expect(first).not.toBe(second);
  });
});
