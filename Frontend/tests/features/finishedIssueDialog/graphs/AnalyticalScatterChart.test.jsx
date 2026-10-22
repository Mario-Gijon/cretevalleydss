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
