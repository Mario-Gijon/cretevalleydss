import { ThemeProvider, createTheme } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../../src/features/finishedIssueDialog/graphs/components/AnalyticalScatterChart", () => ({
  AnalyticalScatterChart: ({ phase }) => <div data-testid="analytical-scatter" data-phase={phase} />,
}));
vi.mock("../../../../../src/features/finishedIssueDialog/graphs/components/AnalyticalConsensusLineChart", () => ({
  AnalyticalConsensusLineChart: () => <div>Consensus chart</div>,
}));

import VisualizationsPanel from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/VisualizationsPanel.jsx";

describe("VisualizationsPanel", () => {
  const rankingAnalysis = (values = [1, 2]) => ({ visualizations: [{ type: "rankingEvolution", data: { phases: [0, 1], series: [{ alternativeId: "a", label: "Alpha", values }] } }] });

  it("passes the selected execution phase to the stored scatter projection", () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <VisualizationsPanel
          scatterPlotRef={{ current: null }}
          onResetZoom={vi.fn()}
          visualizations={{
            mode: "single",
            singleScatter: { available: true, sourcePhase: 5, data: { 5: { expertPoints: [], collectivePoint: { x: 0, y: 0 } } } },
            consensus: { enabled: false },
          }}
        />
      </ThemeProvider>
    );

    expect(screen.getByTestId("analytical-scatter")).toHaveAttribute("data-phase", "5");
  });

  it("renders one shared Ranking evolution section with execution labels in selected order", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel executions={[{ key: "base", displayLabel: "Base", genericAnalysis: rankingAnalysis() }, { key: "test-1", displayLabel: "Test 1", genericAnalysis: rankingAnalysis([2, 1]) }]} visualizations={{ mode: "single", consensus: { enabled: false } }} /></ThemeProvider>);

    expect(screen.getAllByText("Ranking evolution")).toHaveLength(1);
    expect(screen.getByText("Position changes across consensus phases.")).toBeInTheDocument();
    expect(screen.getAllByText("Base")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Test 1")[0]).toBeInTheDocument();
    expect(screen.getAllByTestId("ranking-evolution-divider")).toHaveLength(1);
    expect(screen.getByTestId("ranking-evolution-comparison")).toHaveStyle({ overflowX: "hidden", overflowY: "hidden" });
  });

  it("adds one divider between each adjacent execution without changing order", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel executions={[{ key: "base", displayLabel: "Base", genericAnalysis: rankingAnalysis() }, { key: "test-1", displayLabel: "Test 1", genericAnalysis: rankingAnalysis() }, { key: "test-2", displayLabel: "Test 2", genericAnalysis: rankingAnalysis() }]} visualizations={{ mode: "single", consensus: { enabled: false } }} /></ThemeProvider>);

    expect(screen.getAllByTestId("ranking-evolution-divider")).toHaveLength(2);
    expect(screen.getAllByRole("heading", { level: 6 }).map((heading) => heading.textContent)).toEqual(["Base", "Test 1", "Test 2"]);
  });

  it("keeps a missing execution slot while rendering other ranking charts", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel executions={[{ key: "base", displayLabel: "Base", genericAnalysis: rankingAnalysis() }, { key: "missing", displayLabel: "Missing" }, { key: "test-2", displayLabel: "Test 2", genericAnalysis: rankingAnalysis() }]} visualizations={{ mode: "single", consensus: { enabled: false } }} /></ThemeProvider>);

    expect(screen.getByText("Ranking evolution is not available for this execution.")).toBeInTheDocument();
    expect(screen.getAllByText("Alpha")).toHaveLength(2);
  });
});
