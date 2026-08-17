import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const scatterState = vi.hoisted(() => ({ data: null }));

vi.mock("react-chartjs-2", () => ({
  Scatter: ({ data }) => {
    scatterState.data = data;
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
  });
});
