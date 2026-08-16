import { ThemeProvider, createTheme } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../../src/features/finishedIssueDialog/graphs/components/AnalyticalScatterChart", () => ({
  AnalyticalScatterChart: ({ phase }) => <div data-testid="analytical-scatter" data-phase={phase} />,
}));
vi.mock("../../../../../src/features/finishedIssueDialog/graphs/components/AnalyticalConsensusLineChart", () => ({
  AnalyticalConsensusLineChart: () => <div>Consensus chart</div>,
}));
vi.mock("@mui/x-charts/BarChart", () => ({
  BarChart: ({ height, xAxis }) => <div data-testid="projected-distance-bars" data-height={height} data-labels={xAxis[0].data.join("|")} />,
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

  it("shows scatter and stored distances together while harmlessly ignoring alternative relationships", () => {
    const onResetZoom = vi.fn();
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      scatterPlotRef={{ current: null }}
      onResetZoom={onResetZoom}
      executions={[{
        key: "base",
        displayLabel: "Base",
        genericAnalysis: {
          visualizations: [{ type: "alternativeRelationships", phases: [{ phase: 1, pairs: [] }] }],
        },
      }]}
      visualizations={{
        mode: "single",
        singleScatter: { available: true, sourcePhase: 1, data: { 1: { expertPoints: [], collectivePoint: { x: 0, y: 0 } } } },
        canonicalProjections: [{ key: "base", available: true, displayLabel: "Base", collectivePoint: { x: 0, y: 0 }, expertPoints: [{ identity: "expert-1", label: "Expert 1", email: "expert01@cretevalley.test", x: 0.2, y: 0.1 }] }],
        consensus: { enabled: false },
      }}
    /></ThemeProvider>);

    expect(screen.getByTestId("analytical-scatter")).toBeInTheDocument();
    expect(screen.getByTestId("projected-distance-bars")).toHaveAttribute("data-labels", "expert01@creteval…");
    expect(screen.getByRole("button", { name: "Reset zoom" })).toBeInTheDocument();
    expect(screen.queryByText("Alternative relationships")).not.toBeInTheDocument();
    expect(screen.queryByText("Pairwise separation")).not.toBeInTheDocument();
    expect(screen.queryByText("Relationship network")).not.toBeInTheDocument();
    expect(screen.queryByText("Map")).not.toBeInTheDocument();
    expect(screen.queryByText("Distances")).not.toBeInTheDocument();
    expect(screen.queryByText("Dispersion chart")).not.toBeInTheDocument();
    expect(screen.queryByText("Bar chart")).not.toBeInTheDocument();
    expect(screen.queryByText("Projected distance to collective")).not.toBeInTheDocument();
    expect(screen.queryByText("Base")).not.toBeInTheDocument();
  });

  it("uses the existing meaningful consensus availability to switch between map and distances", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      scatterPlotRef={{ current: null }}
      onResetZoom={vi.fn()}
      visualizations={{
        mode: "single",
        singleScatter: { available: true, sourcePhase: 1, data: { 1: { expertPoints: [], collectivePoint: { x: 0, y: 0 } } } },
        canonicalProjections: [{ key: "base", available: true, displayLabel: "Base", collectivePoint: { x: 0, y: 0 }, expertPoints: [{ identity: "expert-1", email: "expert01@cretevalley.test", x: 0.2, y: 0.1 }] }],
        consensus: { enabled: true, available: true, graph: { labels: ["Phase 0", "Round 1"], series: [] } },
      }}
    /></ThemeProvider>);

    expect(screen.getByRole("group", { name: "Expert collective representation" })).toBeInTheDocument();
    expect(screen.getByTestId("analytical-scatter")).toBeInTheDocument();
    expect(screen.queryByTestId("projected-distance-bars")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset zoom" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Distances" }));
    expect(screen.queryByTestId("analytical-scatter")).not.toBeInTheDocument();
    expect(screen.getByTestId("projected-distance-bars")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reset zoom" })).not.toBeInTheDocument();
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

  it("renders persisted stability and agreement data while ignoring process overview", () => {
    const futureAnalysis = {
      facts: { processOverview: { phaseCount: 3, leaderChangeCount: 2, stabilizationPhase: 2, consensus: { enabled: true, change: 0.3, reached: false }, participation: { completedCount: 2, totalCount: 2, completionRate: 1 } } },
      visualizations: [
        { type: "rankingEvolution", data: { phases: [0, 1], series: [{ alternativeId: "a", label: "Alpha", values: [1, 2] }] } },
        { type: "rankingStability", alternatives: [{ alternativeId: "a", name: "Alpha", initialRank: 1, finalRank: 2, bestRank: 1, worstRank: 3, totalMovement: 5, positionChangeCount: 2 }] },
        { type: "rankingAgreement", transitions: [{ fromPhase: 0, toPhase: 1, coefficient: -1 }, { fromPhase: 1, toPhase: 2, coefficient: 1 }], stabilizationPhase: 2 },
      ],
    };
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel executions={[{ key: "base", displayLabel: "Base", color: "#27d5e4", genericAnalysis: futureAnalysis }, { key: "test", displayLabel: "Test", genericAnalysis: { visualizations: [] } }]} visualizations={{ mode: "single", consensus: { enabled: false } }} /></ThemeProvider>);

    expect(screen.queryByText("Process overview")).not.toBeInTheDocument();
    expect(screen.getByText("Ranking stability")).toBeInTheDocument();
    expect(screen.getByLabelText(/Alpha: initial rank 1, final rank 2, best rank 1, worst rank 3, total movement 5/)).toBeInTheDocument();
    expect(screen.getByText("Ranking similarity between rounds")).toBeInTheDocument();
    expect(screen.getByLabelText("Initial to Round 1: -1.00")).toBeInTheDocument();
    expect(screen.getByText("Ranking similarity is not available for this execution.")).toBeInTheDocument();
  });

  it("hides future visualization sections when persisted analyses do not provide them", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel executions={[{ key: "base", displayLabel: "Base", genericAnalysis: rankingAnalysis() }]} visualizations={{ mode: "single", consensus: { enabled: false } }} /></ThemeProvider>);

    expect(screen.queryByText("Ranking stability")).not.toBeInTheDocument();
    expect(screen.queryByText("Ranking similarity between rounds")).not.toBeInTheDocument();
  });

  it("places both secondary visualizations side by side for one execution", () => {
    const genericAnalysis = { visualizations: [{ type: "rankingStability", alternatives: [] }, { type: "rankingAgreement", transitions: [{ fromPhase: 0, toPhase: 1, coefficient: 0 }] }] };
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel executions={[{ key: "base", displayLabel: "Base", genericAnalysis }]} visualizations={{ mode: "single", consensus: { enabled: false } }} /></ThemeProvider>);
    expect(screen.getByTestId("secondary-visualizations-single-layout")).toBeInTheDocument();
    expect(screen.getByText("Rank · 1 = best")).toBeInTheDocument();
    expect(screen.getByText(/1 = same ranking order/)).toBeInTheDocument();
  });

  it("keeps secondary visualizations as separate rows for multiple executions", () => {
    const genericAnalysis = { visualizations: [{ type: "rankingStability", alternatives: [] }, { type: "rankingAgreement", transitions: [{ fromPhase: 0, toPhase: 1, coefficient: 0 }] }] };
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel executions={[{ key: "base", displayLabel: "Base", genericAnalysis }, { key: "test", displayLabel: "Test", genericAnalysis }]} visualizations={{ mode: "single", consensus: { enabled: false } }} /></ThemeProvider>);
    expect(screen.queryByTestId("secondary-visualizations-single-layout")).not.toBeInTheDocument();
    expect(screen.getByTestId("ranking-stability")).toBeInTheDocument();
    expect(screen.getByTestId("ranking-agreement")).toBeInTheDocument();
    expect(screen.getAllByTestId("ranking-stability-divider")).toHaveLength(1);
    expect(screen.getAllByTestId("ranking-agreement-divider")).toHaveLength(1);
  });
});
