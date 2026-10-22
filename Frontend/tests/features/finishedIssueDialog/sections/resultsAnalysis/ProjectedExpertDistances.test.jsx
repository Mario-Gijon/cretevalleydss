import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const chartState = vi.hoisted(() => ({ props: null }));

vi.mock("@mui/x-charts/BarChart", () => ({
  BarChart: (props) => {
    chartState.props = props;
    return <div data-testid="distance-bar-chart" />;
  },
}));

import ProjectedExpertDistances from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/ProjectedExpertDistances.jsx";

const projection = (expertPoints) => ({
  key: "base",
  displayLabel: "Base execution",
  color: "#27d5e4",
  available: true,
  collectivePoint: { x: 0, y: 0 },
  expertPoints,
});

describe("ProjectedExpertDistances", () => {
  it("explains zero-height bars, keeps exact zeros, and disambiguates repeated names", () => {
    render(
      <ProjectedExpertDistances
        projections={[projection([
          { x: 0, y: 0, label: "Shared name", identity: "expert-1", email: "one@example.test" },
          { x: 0, y: 0, label: "Shared name", identity: "expert-2", email: "two@example.test" },
        ])]}
        phase={0}
      />,
    );

    expect(screen.getByTestId("projected-distance-interpretation").textContent).toContain("no visible height");
    expect(screen.getByTestId("projected-distance-interpretation").textContent).toContain("not direct measures of agreement");
    expect(chartState.props.series[0].data).toEqual([0, 0]);
    expect(chartState.props.barLabel({ value: 0, dataIndex: 0 })).toBe("0.000");
    expect(chartState.props.series[0].valueFormatter(0, { dataIndex: 1 })).toContain("two@example.test");
  });

  it("shows additional precision for positive distances below the former display precision", () => {
    render(
      <ProjectedExpertDistances
        projections={[projection([
          { x: 0.0000004, y: 0, label: "Tiny distance", identity: "expert-tiny" },
        ])]}
        phase={1}
      />,
    );

    expect(chartState.props.series[0].data).toEqual([0.0000004]);
    expect(chartState.props.series[0].valueFormatter(0.0000004, { dataIndex: 0 })).toContain("4e-7");
    expect(chartState.props.barLabel({ value: 0.0000004, dataIndex: 0 })).toBe("4e-7");
    expect(screen.getByTestId("projected-distance-interpretation").textContent).toContain("scientific notation");
  });
});
