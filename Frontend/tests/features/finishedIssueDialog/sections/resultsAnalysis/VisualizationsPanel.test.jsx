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
  BarChart: ({ height, xAxis, series }) => <div data-testid="projected-distance-bars" data-height={height} data-labels={xAxis[0].data.join("|")} data-values={series[0].data.join("|")} />,
}));
vi.mock("../../../../../src/components/analyticalGraphs", () => ({
  AnalyticalGraph: ({ visualization, titleVariant }) => <div data-testid="analytical-graph" data-key={visualization?.key} data-title-variant={titleVariant}>{visualization?.key}</div>,
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

  it("renders only the full-width projection for one coincident expert", () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <VisualizationsPanel
          scatterPlotRef={{ current: null }}
          onResetZoom={vi.fn()}
          visualizations={{
            mode: "single",
            singleScatter: { available: true, sourcePhase: 0, data: { 0: { expertPoints: [{ label: "Ada Lovelace", x: 0, y: 0 }], collectivePoint: { x: 0, y: 0 } } } },
            canonicalProjections: [{ key: "base", available: true, collectivePoint: { x: 0, y: 0 }, expertPoints: [{ label: "Ada Lovelace", identity: "expert-1", x: 0, y: 0 }] }],
            consensus: { enabled: false },
          }}
        />
      </ThemeProvider>
    );

    expect(screen.getByTestId("analytical-scatter")).toBeInTheDocument();
    expect(screen.queryByTestId("projected-distance-bars")).not.toBeInTheDocument();
    expect(screen.getByTestId("single-expert-projection")).toHaveStyle({ width: "100%", minWidth: "0" });
  });

  it("renders one execution's model-specific descriptors in stored order after General visualizations", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{ key: "base", displayLabel: "Base", modelName: "TOPSIS 2-tuple", alternativeEvaluationAnalysis: { analysis: { visualizations: [{ key: "model-bar", type: "bar" }, { key: "model-heatmap", type: "heatmap" }] } } }]}
      visualizations={{ mode: "single", consensus: { enabled: false } }}
    /></ThemeProvider>);

    expect(screen.getByText("General visualizations")).toBeInTheDocument();
    expect(screen.getByText("Alternative evaluation visualizations")).toBeInTheDocument();
    expect(screen.queryByText("TOPSIS 2-tuple")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("analytical-graph").map((graph) => graph.dataset.key)).toEqual(["model-bar", "model-heatmap"]);
  });

  it("renders criteria-weighting model visualizations before alternative-evaluation visualizations", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{ key: "base", displayLabel: "Base", stageAnalyses: {
        criteriaWeighting: { analysis: { visualizations: [{ key: "criteria-chart", type: "bar" }] } },
        alternativeEvaluation: { analysis: { visualizations: [{ key: "alternative-chart", type: "line" }] } },
      } }]}
      visualizations={{ mode: "single", consensus: { enabled: false } }}
    /></ThemeProvider>);

    expect(screen.getByText("Criterion weighting visualizations").compareDocumentPosition(screen.getByText("Alternative evaluation visualizations")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByTestId("analytical-graph").map((graph) => graph.dataset.key)).toEqual(["criteria-chart", "alternative-chart"]);
  });

  it("renders each model-specific visualization as an isolated dashboard card", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[
        { key: "base", displayLabel: "Base", modelName: "Base model", alternativeEvaluationAnalysis: { analysis: { visualizations: [{ key: "base-chart", type: "bar" }] } } },
        { key: "scenario", displayLabel: "Scenario A", modelName: "Scenario model", alternativeEvaluationAnalysis: { analysis: { visualizations: [{ key: "scenario-chart-1", type: "line" }, { key: "scenario-chart-2", type: "radar" }] } } },
      ]}
      visualizations={{ mode: "single", consensus: { enabled: false } }}
    /></ThemeProvider>);

    expect(screen.getAllByTestId("model-analysis-semantic-section")).toHaveLength(1);
    expect(screen.getAllByTestId("semantic-section-scenario")).toHaveLength(2);
    expect(screen.getAllByTestId("semantic-section-scenario-divider")).toHaveLength(1);
    expect(screen.getByText("Base")).toBeInTheDocument();
    expect(screen.getByText("Scenario A")).toBeInTheDocument();
    expect(screen.getAllByTestId("analytical-graph").map((graph) => graph.dataset.key)).toEqual(["base-chart", "scenario-chart-1", "scenario-chart-2"]);
  });

  it("uses a stronger semantic heading for multi-graph sections and no redundant heading for a singleton", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{ key: "base", displayLabel: "Base", alternativeEvaluationAnalysis: { analysis: { sections: [
        { id: "multi", title: "Distance geometry", order: 0, visualizations: [{ key: "d-plus", type: "pie" }, { key: "d-minus", type: "pie" }] },
        { id: "single", title: "Standalone diagnostic", order: 1, visualizations: [{ key: "diagnostic", type: "bar" }] },
      ] } } }]}
      visualizations={{ mode: "single", consensus: { enabled: false } }}
    /></ThemeProvider>);

    expect(screen.getByRole("heading", { name: "Distance geometry" })).toHaveClass("MuiTypography-h6");
    expect(screen.getAllByTestId("analytical-graph").slice(0, 2)).toSatisfy((graphs) => graphs.every((graph) => graph.dataset.titleVariant === "subtitle1"));
    expect(screen.queryByText("Standalone diagnostic")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("analytical-graph")[2]).toHaveAttribute("data-title-variant", "h6");
  });

  it("stacks every direct child when generic section presentation requests it", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{ key: "base", displayLabel: "Base", alternativeEvaluationAnalysis: { analysis: { sections: [{
        id: "stacked", title: "Sensitivity", order: 0, presentation: { layout: "stacked" },
        visualizations: [{ key: "one", type: "pie" }, { key: "two", type: "pie" }, { key: "three", type: "pie" }],
      }] } } }]}
      visualizations={{ mode: "single", consensus: { enabled: false } }}
    /></ThemeProvider>);

    expect(screen.getAllByTestId("semantic-section-pane-row")).toHaveLength(3);
    expect(screen.queryByTestId("semantic-section-pane-divider")).not.toBeInTheDocument();
  });

  it("uses the generic lead-full-width section layout before pairing remaining visualizations", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{ key: "base", displayLabel: "Base", stageAnalyses: { criteriaWeighting: { analysis: { sections: [{
        id: "adjustment", title: "Adjustment", order: 0, presentation: { layout: "lead-full-width" },
        visualizations: [{ key: "map", type: "heatmap" }, { key: "expert-effort", type: "bar" }, { key: "criterion-effort", type: "bar" }],
      }] } } } }]}
      visualizations={{ mode: "single", consensus: { enabled: false } }}
    /></ThemeProvider>);

    expect(screen.getAllByTestId("semantic-section-pane-row")).toHaveLength(2);
    expect(screen.getAllByTestId("semantic-section-pane-row")[0].querySelectorAll("[data-testid='alternative-evaluation-visualization-pane']")).toHaveLength(1);
    expect(screen.getAllByTestId("semantic-section-pane-row")[1].querySelectorAll("[data-testid='alternative-evaluation-visualization-pane']")).toHaveLength(2);
    expect(screen.getAllByTestId("semantic-section-pane-divider")).toHaveLength(1);
  });

  it("renders one unavailable expert–collective state for one execution", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      visualizations={{ mode: "single", singleScatter: { available: false, unavailableReason: "missing_analytical_projection" }, consensus: { enabled: false } }}
    /></ThemeProvider>);

    expect(screen.getAllByText("No stored expert–collective analytical projection is available for this execution.")).toHaveLength(1);
    expect(screen.queryByTestId("semantic-section-pane-divider")).not.toBeInTheDocument();
  });

  it("applies packed compact and full-width spans to individual visualization cards", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{ key: "base", displayLabel: "Base", modelName: "Base model", alternativeEvaluationAnalysis: { analysis: { visualizations: [
        { key: "compact", type: "pie", data: { items: [] } },
        { key: "normal", type: "radar", data: { axes: [] } },
        { key: "heavy", type: "line", data: { x: Array.from({ length: 8 }, (_, index) => index), series: [] } },
      ] } } }]}
      visualizations={{ mode: "single", consensus: { enabled: false } }}
    /></ThemeProvider>);

    expect(screen.getAllByTestId("alternative-evaluation-visualization-pane")).toHaveLength(3);
    expect(screen.getAllByTestId("semantic-section-pane-divider")).toHaveLength(1);
  });

  it("keeps related visualizations paired for one execution while preserving stacked metadata", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{ key: "only", displayLabel: "Only", alternativeEvaluationAnalysis: { analysis: { sections: [
        { id: "generic-grid", title: "Generic grid", order: 0, visualizations: [{ key: "left", type: "pie" }, { key: "right", type: "pie" }] },
        { id: "generic-stacked", title: "Generic stacked", order: 1, presentation: { layout: "stacked" }, visualizations: [{ key: "top", type: "pie" }, { key: "bottom", type: "pie" }] },
      ] } } }]}
      visualizations={{ mode: "single", consensus: { enabled: false } }}
    /></ThemeProvider>);

    expect(screen.getAllByTestId("semantic-section-pane-divider")).toHaveLength(1);
    expect(screen.getAllByTestId("semantic-section-pane-row")).toHaveLength(3);
  });

  it("uses one full-width visualization row per execution column for two generic executions", () => {
    const sections = [{ id: "generic-comparison", title: "Generic comparison", order: 0, visualizations: [{ key: "first", type: "pie" }, { key: "second", type: "pie" }] }];
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[
        { key: "left", displayLabel: "Left", alternativeEvaluationAnalysis: { analysis: { sections } } },
        { key: "right", displayLabel: "Right", alternativeEvaluationAnalysis: { analysis: { sections } } },
      ]}
      visualizations={{ mode: "comparison", expertCollectiveComparison: { presentation: "unavailable", footerMessage: "Unavailable" }, consensus: { enabled: false } }}
    /></ThemeProvider>);

    expect(screen.getAllByTestId("semantic-section-scenario")).toHaveLength(2);
    expect(screen.getAllByTestId("semantic-section-scenario-divider")).toHaveLength(1);
    expect(screen.getAllByTestId("semantic-section-pane-row")).toHaveLength(4);
    expect(screen.queryByTestId("semantic-section-pane-divider")).not.toBeInTheDocument();
    screen.getAllByTestId("alternative-evaluation-visualization-pane").forEach((pane) => {
      expect(pane).toHaveStyle({ width: "100%", minWidth: "0" });
    });
  });

  it("keeps three outer execution columns while stacking generic visualizations within each one", () => {
    const sectionFor = (key) => ({ key, displayLabel: key, alternativeEvaluationAnalysis: { analysis: { sections: [{ id: "not-model-specific", title: "Shared concept", order: 0, visualizations: [{ key: "one", type: "pie" }, { key: "two", type: "pie" }] }] } } });
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[sectionFor("First"), sectionFor("Second"), sectionFor("Third")]}
      visualizations={{ mode: "comparison", expertCollectiveComparison: { presentation: "unavailable", footerMessage: "Unavailable" }, consensus: { enabled: false } }}
    /></ThemeProvider>);

    expect(screen.getAllByTestId("semantic-section-scenario")).toHaveLength(3);
    expect(screen.getAllByTestId("semantic-section-scenario-divider")).toHaveLength(2);
    expect(screen.getAllByTestId("semantic-section-pane-row")).toHaveLength(6);
    expect(screen.queryByTestId("semantic-section-pane-divider")).not.toBeInTheDocument();
  });

  it("shows unavailable execution model visualizations without fabricating graphs", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[
        { key: "base", displayLabel: "Base", modelName: "Base model", alternativeEvaluationAnalysis: { analysis: { visualizations: [{ key: "base-chart", type: "bar" }] } } },
        { key: "scenario", displayLabel: "Scenario A", modelName: "Scenario model", alternativeEvaluationAnalysis: { analysis: { visualizations: [] } } },
      ]}
      visualizations={{ mode: "single", consensus: { enabled: false } }}
    /></ThemeProvider>);

    expect(screen.getAllByTestId("analytical-graph")).toHaveLength(1);
    expect(screen.getByText("Alternative-evaluation visualizations are not available for this execution.")).toBeInTheDocument();
  });

  it("omits model-specific visualizations when no selected execution provides descriptors", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{ key: "base", displayLabel: "Base", modelName: "Base model", alternativeEvaluationAnalysis: { analysis: { visualizations: [] } } }]}
      visualizations={{ mode: "single", consensus: { enabled: false } }}
    /></ThemeProvider>);

    expect(screen.queryByText("Alternative evaluation visualizations")).not.toBeInTheDocument();
    expect(screen.queryByTestId("analytical-graph")).not.toBeInTheDocument();
  });

  it("shows scatter and stored distances for multiple experts while harmlessly ignoring alternative relationships", () => {
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
        canonicalProjections: [{ key: "base", available: true, displayLabel: "Base", collectivePoint: { x: 0, y: 0 }, expertPoints: [{ identity: "expert-1", label: "Expert 1", email: "expert01@cretevalley.test", x: 0.2, y: 0.1 }, { identity: "expert-2", label: "Expert 2", email: "expert02@cretevalley.test", x: -0.2, y: -0.1 }] }],
        consensus: { enabled: false },
      }}
    /></ThemeProvider>);

    expect(screen.getByTestId("analytical-scatter")).toBeInTheDocument();
    expect(screen.getByTestId("projected-distance-bars")).toHaveAttribute("data-labels", "Expert 1|Expert 2");
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
        canonicalProjections: [{ key: "base", available: true, displayLabel: "Base", collectivePoint: { x: 0, y: 0 }, expertPoints: [{ identity: "expert-1", email: "expert01@cretevalley.test", x: 0.2, y: 0.1 }, { identity: "expert-2", email: "expert02@cretevalley.test", x: -0.2, y: -0.1 }] }],
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
    expect(screen.getAllByText("Ranking similarity between rounds")).toHaveLength(2);
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
    expect(screen.getByTestId("ranking-temporal-card")).toBeInTheDocument();
    expect(screen.getAllByTestId("ranking-stability")).toHaveLength(2);
    expect(screen.getAllByTestId("ranking-agreement")).toHaveLength(2);
  });
});
