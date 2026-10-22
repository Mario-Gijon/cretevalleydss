import { render } from "@testing-library/react";
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
    expect(collective.pointStyle).toBe("rectRot");
    expect(collective.pointRadius).toBe(10);
    expect(collective.borderWidth).toBe(2);
    expect(scatterState.options.plugins.zoom).toBeUndefined();
    expect(scatterState.options.scales.x.min).toBe(-1);
    expect(scatterState.options.scales.x.max).toBe(1);
    expect(scatterState.options.scales.y.min).toBe(-1);
    expect(scatterState.options.scales.y.max).toBe(1);
    expect(scatterState.options.plugins.tooltip.callbacks.label({ datasetIndex: 0, raw: experts.data[0] })).toContain("Adrian Popescu");
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

    expect(tooltipLabel).toContain("Shared name");
    expect(tooltipLabel).toContain("one@example.test");
  });
});
