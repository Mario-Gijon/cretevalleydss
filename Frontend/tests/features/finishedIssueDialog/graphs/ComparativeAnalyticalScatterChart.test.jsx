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

import { ComparativeAnalyticalScatterChart } from "../../../../src/features/finishedIssueDialog/graphs/components/ComparativeAnalyticalScatterChart.jsx";

describe("ComparativeAnalyticalScatterChart", () => {
  it("keeps fixed ranges and hover presentation without zoom or pan controls", () => {
    render(
      <ComparativeAnalyticalScatterChart
        groups={[{
          groupLabel: "Base",
          tooltipLabel: "Base execution",
          color: "#27d5e4",
          representedExecutions: [{ key: "base" }],
          expertPoints: [
            { x: -2, y: -1, label: "Expert One" },
            { x: 2, y: 1, label: "Expert Two" },
          ],
          collectivePoint: { x: 0, y: 0 },
        }]}
      />
    );

    const [experts, collective] = scatterState.data.datasets;
    expect(experts.data).toHaveLength(2);
    expect(collective.data).toHaveLength(1);
    expect(collective.pointStyle).toBe("rectRot");
    expect(scatterState.options.plugins.zoom).toBeUndefined();
    expect(scatterState.options.scales.x.min).toBe(-2.8);
    expect(scatterState.options.scales.x.max).toBe(2.8);
    expect(scatterState.options.scales.y.min).toBe(-1.4);
    expect(scatterState.options.scales.y.max).toBe(1.4);
    expect(scatterState.options.plugins.legend.display).toBe(true);
    expect(scatterState.options.plugins.tooltip.callbacks.label({ raw: experts.data[0] })).toContain("Expert One");
    expect(scatterState.options.plugins.tooltip.callbacks.label({ raw: collective.data[0] })).toContain("Collective");
  });

  it("disambiguates duplicate expert labels while comparing executions", () => {
    render(
      <ComparativeAnalyticalScatterChart
        groups={[{
          groupLabel: "Base",
          tooltipLabel: "Base execution",
          color: "#27d5e4",
          representedExecutions: [{ key: "base" }],
          expertPoints: [
            { x: -1, y: 0, label: "Shared name", identity: "expert-1", email: "one@example.test" },
            { x: 1, y: 0, label: "Shared name", identity: "expert-2", email: "two@example.test" },
          ],
          collectivePoint: { x: 0, y: 0 },
        }]}
      />
    );

    const [experts] = scatterState.data.datasets;
    const tooltipLabel = scatterState.options.plugins.tooltip.callbacks.label({ raw: experts.data[0] });

    expect(tooltipLabel).toContain("Shared name");
    expect(tooltipLabel).toContain("one@example.test");
    expect(tooltipLabel).toContain("Base execution");
  });
});
