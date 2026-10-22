import { ThemeProvider, createTheme } from "@mui/material/styles";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../../src/features/finishedIssueDialog/graphs/components/AnalyticalScatterChart", () => ({
  AnalyticalScatterChart: ({ phase }) => <div data-testid="analytical-scatter" data-phase={phase} />,
}));
vi.mock("../../../../../src/features/finishedIssueDialog/graphs/components/ComparativeAnalyticalScatterChart", () => ({
  ComparativeAnalyticalScatterChart: ({ groups }) => <div data-testid="comparative-scatter">{groups.length}</div>,
}));
vi.mock("../../../../../src/features/finishedIssueDialog/graphs/components/AnalyticalConsensusLineChart", () => ({
  AnalyticalConsensusLineChart: () => <div>Consensus chart</div>,
}));
vi.mock("@mui/x-charts/BarChart", () => ({
  BarChart: ({ height, xAxis, series }) => <div data-testid="projected-distance-bars" data-height={height} data-labels={xAxis[0].data.join("|")} data-values={series[0].data.join("|")} />,
}));
vi.mock("../../../../../src/components/analyticalGraphs", () => ({
  AnalyticalGraph: ({ visualization, titleVariant }) => <div data-testid="analytical-graph" data-key={visualization?.key} data-title-variant={titleVariant}>{visualization?.key}</div>,
  HeatmapAnalyticalGraph: ({ visualization }) => <div data-testid="alternative-relationships-heatmap" data-phase={visualization?.phase} data-values={JSON.stringify(visualization?.data?.values)} data-labels={JSON.stringify(visualization?.data?.rows?.map((row) => row.label))}>{visualization?.data?.rows?.map((row) => row.label).join("|")}</div>,
}));

import VisualizationsPanel from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/VisualizationsPanel.jsx";
import { buildGeneralVisualizationsLayout } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/buildGeneralVisualizationsLayout.js";

describe("VisualizationsPanel", () => {
  const rankingAnalysis = (values = [1, 2]) => ({ visualizations: [{ type: "rankingEvolution", data: { phases: [0, 1], series: [{ alternativeId: "a", label: "Alpha", values }] } }] });

  it("places non-consensus generic visualizations in a full-width vertical sequence", () => {
    const layout = buildGeneralVisualizationsLayout({
      expertCollectiveAvailable: true,
      alternativeRelationshipsAvailable: true,
    });

    expect(layout.primaryRow).toEqual(["expertCollective"]);
    expect(layout.primaryGridTemplateColumns).toBe("minmax(0, 1fr)");
    expect(layout.alternativeRelationshipsBelow).toBe(true);
  });

  it("places Expert, Consensus and relationships in full-width vertical order", () => {
    const layout = buildGeneralVisualizationsLayout({
      expertCollectiveAvailable: true,
      issueConsensusEnabled: true,
      consensusAvailable: true,
      alternativeRelationshipsAvailable: true,
    });

    expect(layout.primaryRow).toEqual(["expertCollective", "consensus"]);
    expect(layout.primaryGridTemplateColumns).toBe("minmax(0, 1fr)");
    expect(layout.alternativeRelationshipsBelow).toBe(true);
  });

  it("uses the available slot when an optional visualization is missing", () => {
    const onlyRelationships = buildGeneralVisualizationsLayout({
      alternativeRelationshipsAvailable: true,
    });
    const unavailableConsensus = buildGeneralVisualizationsLayout({
      expertCollectiveAvailable: true,
      issueConsensusEnabled: true,
      consensusAvailable: false,
      alternativeRelationshipsAvailable: true,
    });

    expect(onlyRelationships.primaryRow).toEqual([]);
    expect(onlyRelationships.primaryGridTemplateColumns).toBe("minmax(0, 1fr)");
    expect(onlyRelationships.alternativeRelationshipsBelow).toBe(true);
    expect(unavailableConsensus.primaryRow).toEqual(["expertCollective"]);
    expect(unavailableConsensus.alternativeRelationshipsBelow).toBe(true);
  });

  it("passes the selected execution phase to the stored scatter projection", () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <VisualizationsPanel
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

  it("explains the consensus axes before rendering the phase chart", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      visualizations={{ mode: "single", consensus: { enabled: true, issueEnabled: true, available: true, graph: { labels: ["Initial", "Round 1"], data: [0.25, 0.7] } } }}
    /></ThemeProvider>);

    const title = screen.getByRole("heading", { name: "Consensus evolution" });
    const guide = screen.getByText(/vertical scale runs from 0% to 100%/);
    const chart = screen.getByText("Consensus chart");
    expect(title.compareDocumentPosition(guide) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(guide.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders only the full-width projection for one coincident expert", () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <VisualizationsPanel
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
    expect(screen.getByTestId("expert-collective-selected-view")).toHaveAttribute("data-view", "map");
    expect(screen.getByTestId("expert-collective-selected-view")).toHaveStyle({ width: "100%", minWidth: "0" });
    expect(screen.queryByRole("group", { name: "Expert collective representation" })).not.toBeInTheDocument();
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

  it("renders model-owned TOPSIS descriptors through the shared alternative-evaluation pipeline", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{
        key: "base",
        displayLabel: "Base",
        alternativeEvaluationAnalysis: { analysis: { sections: [
          { id: "topsis-collective-performance", title: "Collective performance", order: 0, visualizations: [{ key: "topsis-collective-performance-profile", type: "heatmap" }] },
          { id: "topsis-ideal-distance-geometry", title: "TOPSIS reference distances", order: 1, visualizations: [{ key: "topsis-numeric-ideal-distances", type: "scatter" }] },
          { id: "topsis-positive-distance-contributions", title: "Distance from the most desirable reference", order: 2, visualizations: [{ key: "topsis-positive-distance-contributions", type: "bar", stacked: true }] },
          { id: "topsis-negative-distance-contributions", title: "Distance from the least desirable reference", order: 3, visualizations: [{ key: "topsis-negative-distance-contributions", type: "bar", stacked: true }] },
        ] } },
      }]}
      visualizations={{ mode: "single", consensus: { enabled: false } }}
    /></ThemeProvider>);

    expect(screen.getAllByTestId("analytical-graph").map((graph) => graph.dataset.key)).toEqual([
      "topsis-collective-performance-profile",
      "topsis-numeric-ideal-distances",
      "topsis-positive-distance-contributions",
      "topsis-negative-distance-contributions",
    ]);
    expect(screen.getByText("Alternative evaluation visualizations")).toBeInTheDocument();
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

  it("omits an unavailable expert–collective visualization without leaving an empty slot", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      visualizations={{ mode: "single", singleScatter: { available: false, unavailableReason: "missing_analytical_projection" }, consensus: { enabled: false } }}
    /></ThemeProvider>);

    expect(screen.queryByText("No stored expert–collective analytical projection is available for this execution.")).not.toBeInTheDocument();
    expect(screen.queryByTestId("expert-collective-relationship")).not.toBeInTheDocument();
    expect(screen.queryByTestId("general-visualization-primary-row")).not.toBeInTheDocument();
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
    expect(screen.getAllByTestId("visualization-unavailable-state")).toHaveLength(1);
    expect(screen.queryByText("Expected behaviour")).not.toBeInTheDocument();
  });

  it("omits model-specific visualizations when no selected execution provides descriptors", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{ key: "base", displayLabel: "Base", modelName: "Base model", alternativeEvaluationAnalysis: { analysis: { visualizations: [] } } }]}
      visualizations={{ mode: "single", consensus: { enabled: false } }}
    /></ThemeProvider>);

    expect(screen.queryByText("Alternative evaluation visualizations")).not.toBeInTheDocument();
    expect(screen.queryByTestId("analytical-graph")).not.toBeInTheDocument();
  });

  it("shows scatter, stored distances, and valid generic alternative relationships", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{
        key: "base",
        displayLabel: "Base",
        genericAnalysis: {
          facts: { alternativeRelationships: { normalization: { degenerate: false }, unavailablePhases: [] } },
          visualizations: [{ type: "alternativeRelationships", phases: [{ phase: 1, alternatives: [{ alternativeId: "alpha", name: "Alpha", rank: 1 }, { alternativeId: "beta", name: "Beta", rank: 2 }], pairs: [{ leftAlternativeId: "alpha", rightAlternativeId: "beta", relativeSeparation: 0.23 }] }] }],
        },
      }]}
      visualizations={{
        mode: "single",
        singleScatter: { available: true, sourcePhase: 1, data: { 1: { expertPoints: [{ identity: "expert-1", label: "Expert 1", x: 0.2, y: 0.1 }, { identity: "expert-2", label: "Expert 2", x: -0.2, y: -0.1 }], collectivePoint: { x: 0, y: 0 } } } },
        canonicalProjections: [{ key: "base", available: true, displayLabel: "Base", collectivePoint: { x: 0, y: 0 }, expertPoints: [{ identity: "expert-1", label: "Expert 1", email: "expert01@cretevalley.test", x: 0.2, y: 0.1 }, { identity: "expert-2", label: "Expert 2", email: "expert02@cretevalley.test", x: -0.2, y: -0.1 }] }],
        consensus: { enabled: false },
      }}
    /></ThemeProvider>);

    expect(screen.getByTestId("analytical-scatter")).toBeInTheDocument();
    expect(screen.getByTestId("expert-collective-selected-view")).toHaveAttribute("data-view", "map");
    expect(screen.getByRole("group", { name: "Expert collective representation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "MAP" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "DISTANCES" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByTestId("projected-distance-bars")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reset zoom" })).not.toBeInTheDocument();
    expect(screen.getByTestId("alternative-relationships-heatmap")).toHaveAttribute("data-phase", "1");
    expect(screen.getByTestId("alternative-relationships-heatmap")).toHaveAttribute("data-values", "[[null,0.23],[0.23,null]]");
    expect(screen.getByTestId("alternative-relationships-section")).toBeInTheDocument();
    const primaryRow = screen.getByTestId("general-visualization-primary-row");
    expect(primaryRow).toHaveAttribute("data-consensus-layout", "disabled");
    const relationshipRow = screen.getByTestId("alternative-relationships-secondary-row");
    expect(within(primaryRow).getAllByTestId("expert-collective-relationship")).toHaveLength(1);
    expect(within(relationshipRow).getByTestId("alternative-relationships-section")).toBeInTheDocument();
    expect(primaryRow.compareDocumentPosition(relationshipRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByTestId("alternative-relationships-section")).toHaveLength(1);
    expect(within(screen.getByTestId("alternative-relationships-section")).queryByTestId("alternative-relationship-scale")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("alternative-relationships-section")).getByTestId("visualization-reading-guide")).toHaveTextContent(/relative to the observed score range/);
    expect(screen.getByText(/not a percentage of superiority/)).toBeInTheDocument();
    expect(screen.queryByText("Relationship network")).not.toBeInTheDocument();
    expect(screen.getByText(/axes are not geographic coordinates/)).toBeInTheDocument();
    expect(screen.queryByText(/projection distances, not geographic distances/)).not.toBeInTheDocument();
    expect(screen.queryByText("Dispersion chart")).not.toBeInTheDocument();
    expect(screen.queryByText("Bar chart")).not.toBeInTheDocument();
    expect(screen.queryByText("Projected distance to collective")).not.toBeInTheDocument();
    expect(screen.queryByText("Base")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "DISTANCES" }));
    expect(screen.getByTestId("expert-collective-selected-view")).toHaveAttribute("data-view", "distances");
    expect(screen.queryByTestId("analytical-scatter")).not.toBeInTheDocument();
    expect(screen.getByTestId("projected-distance-bars")).toHaveAttribute("data-labels", "Expert 1|Expert 2");
    expect(screen.getByText(/projection distances, not geographic distances/)).toBeInTheDocument();
    expect(screen.queryByText(/axes are not geographic coordinates/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "MAP" }));
    expect(screen.getByTestId("expert-collective-selected-view")).toHaveAttribute("data-view", "map");
    expect(screen.getByTestId("analytical-scatter")).toBeInTheDocument();
    expect(screen.queryByTestId("projected-distance-bars")).not.toBeInTheDocument();
  });

  it("renders TOPSIS-Sort Expert–collective views before its categorical relationships", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{
        key: "base",
        displayLabel: "Base",
        resultStructureKey: "sorting",
        genericAnalysis: {
          facts: { alternativeRelationships: { phases: [] } },
          visualizations: [{
            type: "alternativeRelationships",
            mode: "categorical",
            phases: [{
              phase: 0,
              categoryOrderSemantics: "lower-order-is-less-preferred",
              categories: [
                { categoryId: "low", label: "Low", order: 0 },
                { categoryId: "high", label: "High", order: 1 },
              ],
              alternatives: [
                { alternativeId: "a", name: "Alpha", categoryId: "high" },
                { alternativeId: "b", name: "Beta", categoryId: "low" },
              ],
            }],
          }],
        },
      }]}
      visualizations={{
        mode: "single",
        singleScatter: { available: true, sourcePhase: 0, data: { 0: { expertPoints: [{ identity: "expert-1", label: "Ada", x: 1, y: 0 }, { identity: "expert-2", label: "Grace", x: -1, y: 0 }], collectivePoint: { x: 0, y: 0 } } } },
        canonicalProjections: [{ key: "base", available: true, collectivePoint: { x: 0, y: 0 }, expertPoints: [{ identity: "expert-1", label: "Ada", x: 1, y: 0 }, { identity: "expert-2", label: "Grace", x: -1, y: 0 }] }],
        consensus: { enabled: false },
      }}
    /></ThemeProvider>);

    const primaryRow = screen.getByTestId("general-visualization-primary-row");
    const relationshipRow = screen.getByTestId("alternative-relationships-secondary-row");
    expect(within(primaryRow).getByTestId("expert-collective-relationship")).toBeInTheDocument();
    expect(primaryRow.compareDocumentPosition(relationshipRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: "MAP" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "DISTANCES" }));

    expect(screen.getByTestId("projected-distance-bars")).toHaveAttribute("data-labels", "Ada|Grace");
    expect(screen.getByTestId("expert-collective-selected-view")).toHaveAttribute("data-view", "distances");
  });

  it("shows why a historical sorting projection could not be rebuilt", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{
        key: "base",
        resultStructureKey: "sorting",
        genericAnalysis: { facts: { expertCollectiveRelationship: { unavailableReason: "invalid_frozen_numeric_evidence" } } },
      }]}
      visualizations={{
        mode: "single",
        singleScatter: { available: false, unavailableReason: "invalid_frozen_numeric_evidence" },
        canonicalProjections: [],
        consensus: { enabled: false },
      }}
    /></ThemeProvider>);

    expect(screen.getByTestId("expert-collective-relationship")).toBeInTheDocument();
    expect(screen.getByText(/frozen execution evaluations are incomplete or invalid/)).toBeInTheDocument();
  });

  it("places consensus below Expert and keeps one relationship matrix last", () => {
    const alternatives = [
      { alternativeId: "alpha", name: "Alpha", rank: 1 },
      { alternativeId: "beta", name: "Beta", rank: 2 },
    ];
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{
        key: "base",
        displayLabel: "Base",
        genericAnalysis: {
          facts: { alternativeRelationships: { normalization: { degenerate: false }, unavailablePhases: [] } },
          visualizations: [{ type: "alternativeRelationships", phases: [
            { phase: 0, alternatives, pairs: [{ leftAlternativeId: "alpha", rightAlternativeId: "beta", relativeSeparation: 0.2 }] },
            { phase: 1, alternatives, pairs: [{ leftAlternativeId: "alpha", rightAlternativeId: "beta", relativeSeparation: 0.4 }] },
          ] }],
        },
      }]}
      visualizations={{
        mode: "single",
        singleScatter: { available: true, sourcePhase: 1, data: { 1: { expertPoints: [], collectivePoint: { x: 0, y: 0 } } } },
        consensus: { enabled: true, issueEnabled: true, available: true, graph: { labels: ["Initial", "Round 1"], series: [{ data: [0.3, 0.7] }] } },
      }}
    /></ThemeProvider>);

    const primaryRow = screen.getByTestId("general-visualization-primary-row");
    const expert = within(primaryRow).getByTestId("expert-collective-relationship");
    const consensus = screen.getByTestId("consensus-level-visualization");
    const relationshipRow = screen.getByTestId("alternative-relationships-secondary-row");
    const relationships = within(relationshipRow).getByTestId("alternative-relationships-section");
    expect(expert.compareDocumentPosition(consensus) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(consensus.compareDocumentPosition(relationshipRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByTestId("alternative-relationships-section")).toHaveLength(1);
    expect(screen.getByRole("combobox", { name: "Phase" })).toBeInTheDocument();
    expect(within(relationships).getByTestId("visualization-reading-guide")).toHaveTextContent(/relative to the observed score range/);
  });

  it("does not render missing consensus or expert slots and still shows the relationship heatmap", () => {
    const alternatives = [
      { alternativeId: "alpha", name: "Alpha", rank: 1 },
      { alternativeId: "beta", name: "Beta", rank: 2 },
    ];
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{
        key: "base",
        genericAnalysis: {
          facts: { alternativeRelationships: { normalization: { degenerate: false } } },
          visualizations: [{ type: "alternativeRelationships", phases: [{
            phase: 0,
            alternatives,
            pairs: [{ leftAlternativeId: "alpha", rightAlternativeId: "beta", relativeSeparation: 0.2 }],
          }] }],
        },
      }]}
      visualizations={{
        mode: "single",
        singleScatter: { available: false, unavailableReason: "missing_analytical_projection" },
        consensus: { enabled: false, issueEnabled: true, available: false },
      }}
    /></ThemeProvider>);

    expect(screen.queryByTestId("expert-collective-relationship")).not.toBeInTheDocument();
    expect(screen.queryByTestId("consensus-level-visualization")).not.toBeInTheDocument();
    expect(screen.queryByTestId("general-visualization-primary-row")).not.toBeInTheDocument();
    expect(screen.getByTestId("alternative-relationships-secondary-row")).toBeInTheDocument();
    expect(screen.getAllByTestId("alternative-relationships-section")).toHaveLength(1);
  });

  it("selects among phases within one execution and keeps execution relationships separate", () => {
    const alternatives = [
      { alternativeId: "a", name: "Alpha", rank: 1 },
      { alternativeId: "b", name: "Beta", rank: 2 },
    ];
    const relationship = (phase, separation) => ({
      phase,
      alternatives,
      pairs: [{ leftAlternativeId: "a", rightAlternativeId: "b", relativeSeparation: separation }],
    });
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[
        { key: "base", displayLabel: "Base execution", genericAnalysis: { facts: { alternativeRelationships: { normalization: { degenerate: false } } }, visualizations: [{ type: "alternativeRelationships", phases: [relationship(0, 0.2), relationship(1, 0.7)] }] } },
        { key: "scenario", displayLabel: "Scenario A", genericAnalysis: { facts: { alternativeRelationships: { normalization: { degenerate: false } } }, visualizations: [{ type: "alternativeRelationships", phases: [relationship(0, 0.4)] }] } },
      ]}
      visualizations={{
        mode: "comparison",
        consensus: { enabled: false },
        expertCollectiveComparison: { presentation: "unavailable", footerMessage: "No projections available." },
      }}
    /></ThemeProvider>);

    const heatmaps = screen.getAllByTestId("alternative-relationships-heatmap");
    expect(heatmaps).toHaveLength(2);
    expect(heatmaps[0]).toHaveAttribute("data-phase", "1");
    expect(heatmaps[0]).toHaveAttribute("data-values", "[[null,0.7],[0.7,null]]");
    expect(heatmaps[1]).toHaveAttribute("data-values", "[[null,0.4],[0.4,null]]");
    expect(screen.getByText("Base execution")).toBeInTheDocument();
    expect(screen.getByText("Scenario A")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Phase" }));
    fireEvent.click(screen.getByRole("option", { name: "Initial" }));
    expect(screen.getAllByTestId("alternative-relationships-heatmap")[0]).toHaveAttribute("data-values", "[[null,0.2],[0.2,null]]");
  });

  it("renders partial relationship data with missing pairs distinct from zero", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{
        key: "base",
        displayLabel: "Base",
        genericAnalysis: {
          facts: { alternativeRelationships: { normalization: { degenerate: false } } },
          visualizations: [{ type: "alternativeRelationships", phases: [{
            phase: 0,
            alternatives: [
              { alternativeId: "a", name: "Alpha", rank: 1 },
              { alternativeId: "b", name: "Beta", rank: 2 },
              { alternativeId: "c", name: "Gamma", rank: 3 },
            ],
            pairs: [{ leftAlternativeId: "a", rightAlternativeId: "b", relativeSeparation: 0 }],
          }] }],
        },
      }]}
      visualizations={{ mode: "single", consensus: { enabled: false } }}
    /></ThemeProvider>);

    expect(screen.getByTestId("alternative-relationships-heatmap")).toHaveAttribute(
      "data-values",
      "[[null,0,null],[0,null,null],[null,null,null]]",
    );
    expect(screen.getByTestId("alternative-relationships-missing-pairs")).toHaveTextContent(
      "not treated as zero",
    );
  });

  it("shows equal score values without assigning them a comparative color advantage", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{
        key: "base",
        displayLabel: "Base",
        genericAnalysis: {
          facts: { alternativeRelationships: { normalization: { degenerate: false } } },
          visualizations: [{ type: "alternativeRelationships", phases: [{
            phase: 0,
            alternatives: [
              { alternativeId: "a", name: "Alpha", rank: 1 },
              { alternativeId: "b", name: "Beta", rank: 2 },
            ],
            pairs: [{ leftAlternativeId: "a", rightAlternativeId: "b", relativeSeparation: 0 }],
          }] }],
        },
      }]}
      visualizations={{ mode: "single", consensus: { enabled: false } }}
    /></ThemeProvider>);

    expect(screen.getByTestId("alternative-relationships-heatmap")).toHaveAttribute(
      "data-values",
      "[[null,0],[0,null]]",
    );
    expect(screen.getByTestId("alternative-relationships-equal-phase")).toHaveTextContent(
      "scores in this phase are equal",
    );
  });

  it("does not show a misleading chart for globally degenerate scores or absent descriptors", () => {
    const alternatives = [
      { alternativeId: "a", name: "Alpha", rank: 1 },
      { alternativeId: "b", name: "Beta", rank: 2 },
    ];
    const { rerender } = render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{
        key: "base",
        displayLabel: "Base",
        genericAnalysis: {
          facts: { alternativeRelationships: { normalization: { degenerate: true } } },
          visualizations: [{ type: "alternativeRelationships", phases: [{ phase: 0, alternatives, pairs: [{ leftAlternativeId: "a", rightAlternativeId: "b", relativeSeparation: 0 }] }] }],
        },
      }]}
      visualizations={{ mode: "single", consensus: { enabled: false } }}
    /></ThemeProvider>);

    expect(screen.getByTestId("alternative-relationships-degenerate")).toBeInTheDocument();
    expect(screen.queryByTestId("alternative-relationships-heatmap")).not.toBeInTheDocument();

    rerender(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{ key: "base", displayLabel: "Base", genericAnalysis: { visualizations: [] } }]}
      visualizations={{ mode: "single", consensus: { enabled: false } }}
    /></ThemeProvider>);
    expect(screen.queryByTestId("alternative-relationships-section")).not.toBeInTheDocument();
  });

  it("omits the relationship section for an empty descriptor and for a missing descriptor", () => {
    const { rerender } = render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{ key: "base", displayLabel: "Base", genericAnalysis: { visualizations: [{ type: "alternativeRelationships", phases: [] }] } }]}
      visualizations={{ mode: "single", consensus: { enabled: false } }}
    /></ThemeProvider>);
    expect(screen.queryByTestId("alternative-relationships-section")).not.toBeInTheDocument();

    rerender(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{ key: "base", displayLabel: "Base", genericAnalysis: { visualizations: [] } }]}
      visualizations={{ mode: "single", consensus: { enabled: false } }}
    /></ThemeProvider>);
    expect(screen.queryByTestId("alternative-relationships-section")).not.toBeInTheDocument();
  });

  it("keeps long alternative names and many alternatives available in the relationship matrix", () => {
    const alternatives = Array.from({ length: 12 }, (_, index) => ({
      alternativeId: `alternative-${index}`,
      name: `Alternative ${index} with a deliberately long display name`,
      rank: index + 1,
    }));
    const pairs = [];
    alternatives.forEach((left, index) => alternatives.slice(index + 1).forEach((right) => pairs.push({
      leftAlternativeId: left.alternativeId,
      rightAlternativeId: right.alternativeId,
      relativeSeparation: (index + 1) / 12,
    })));
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{ key: "base", displayLabel: "Base", genericAnalysis: {
        facts: { alternativeRelationships: { normalization: { degenerate: false } } },
        visualizations: [{ type: "alternativeRelationships", phases: [{ phase: 0, alternatives, pairs }] },
      ] } }]}
      visualizations={{ mode: "single", consensus: { enabled: false } }}
    /></ThemeProvider>);

    const heatmap = screen.getByTestId("alternative-relationships-heatmap");
    expect(JSON.parse(heatmap.getAttribute("data-labels"))).toHaveLength(12);
    expect(heatmap).toHaveAttribute("data-values", expect.stringContaining("0.08333333333333333"));
    expect(screen.getByTestId("alternative-relationships-heatmap-viewport")).toBeInTheDocument();
  });

  it("shows only the available map without a selector when distances are unavailable", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      visualizations={{
        mode: "single",
        singleScatter: { available: true, sourcePhase: 1, data: { 1: { expertPoints: [{ identity: "expert-1", label: "Expert 1", x: 0.2, y: 0.1 }, { identity: "expert-2", label: "Expert 2", x: -0.2, y: -0.1 }], collectivePoint: { x: 0, y: 0 } } } },
        canonicalProjections: [{ key: "base", available: false, displayLabel: "Base", collectivePoint: null, expertPoints: [] }],
        consensus: { enabled: false, issueEnabled: false, available: false },
      }}
    /></ThemeProvider>);

    expect(screen.queryByRole("group", { name: "Expert collective representation" })).not.toBeInTheDocument();
    expect(screen.getByTestId("analytical-scatter")).toBeInTheDocument();
    expect(screen.getByText(/axes are not geographic coordinates/)).toBeInTheDocument();
    expect(screen.queryByTestId("projected-distance-bars")).not.toBeInTheDocument();
  });

  it("shows available distances directly when the projection map is unavailable", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      visualizations={{
        mode: "single",
        singleScatter: { available: false, unavailableReason: "missing_analytical_projection" },
        canonicalProjections: [{ key: "base", available: true, displayLabel: "Base", collectivePoint: { x: 0, y: 0 }, expertPoints: [{ identity: "expert-1", label: "Expert 1", x: 0.2, y: 0.1 }, { identity: "expert-2", label: "Expert 2", x: -0.2, y: -0.1 }] }],
        consensus: { enabled: false, issueEnabled: false, available: false },
      }}
    /></ThemeProvider>);

    expect(screen.queryByRole("group", { name: "Expert collective representation" })).not.toBeInTheDocument();
    expect(screen.getByTestId("expert-collective-selected-view")).toHaveAttribute("data-view", "distances");
    expect(screen.queryByTestId("analytical-scatter")).not.toBeInTheDocument();
    expect(screen.getByTestId("projected-distance-bars")).toBeInTheDocument();
    expect(screen.getByText(/Each bar measures the distance/)).toBeInTheDocument();
    expect(screen.queryByText(/axes are not geographic coordinates/)).not.toBeInTheDocument();
  });

  it("switches the comparison map and distances using expert identities from valid projections", () => {
    const canonicalProjections = [{
      key: "base",
      available: true,
      collectivePoint: { x: 0, y: 0 },
      expertPoints: [
        { identity: "expert-1", label: "Expert 1", x: 0.2, y: 0.1 },
        { identity: "expert-2", label: "Expert 2", x: -0.2, y: -0.1 },
      ],
    }];
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      visualizations={{
        mode: "comparison",
        canonicalProjections,
        expertCollectiveComparison: {
          available: true,
          presentation: "shared",
          sharedProjection: { id: "shared-projection" },
        },
        consensus: { enabled: false, issueEnabled: false, available: false },
      }}
    /></ThemeProvider>);

    expect(screen.getByTestId("comparative-scatter")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "MAP" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByTestId("projected-distance-bars")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "DISTANCES" }));
    expect(screen.queryByTestId("comparative-scatter")).not.toBeInTheDocument();
    expect(screen.getByTestId("projected-distance-bars")).toHaveAttribute("data-labels", "Expert 1|Expert 2");
  });

  it("does not render Reset zoom for scenario comparison relationships", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      visualizations={{
        mode: "comparison",
        expertCollectiveComparison: { presentation: "unavailable", footerMessage: "Unavailable" },
        consensus: { enabled: false },
      }}
    /></ThemeProvider>);

    expect(screen.queryByRole("heading", { name: "Expert–collective relationship" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reset zoom" })).not.toBeInTheDocument();
  });

  it("renders one shared Ranking evolution section with execution labels in selected order", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel executions={[{ key: "base", displayLabel: "Base", genericAnalysis: rankingAnalysis() }, { key: "test-1", displayLabel: "Test 1", genericAnalysis: rankingAnalysis([2, 1]) }]} visualizations={{ mode: "single", consensus: { enabled: false } }} /></ThemeProvider>);

    expect(screen.getAllByText("Ranking evolution")).toHaveLength(1);
    expect(screen.getByText(/Each colored line follows one alternative across phases/)).toBeInTheDocument();
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

    expect(
      within(screen.getByTestId("ranking-evolution-comparison")).getByText(
        "Visualization not applicable for this execution"
      )
    ).toBeInTheDocument();
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
    expect(screen.getAllByText("Ranking stability")).toHaveLength(2);
    expect(screen.getByLabelText(/Alpha: initial rank 1, final rank 2, best rank 1, worst rank 3, total movement 5/)).toBeInTheDocument();
    expect(screen.getAllByText("Ranking similarity between rounds")).toHaveLength(2);
    expect(screen.getByLabelText("Initial to Round 1: -1.00")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("ranking-temporal-card")).getAllByTestId(
        "visualization-unavailable-state"
      )
    ).toHaveLength(2);
  });

  it("hides future visualization sections when persisted analyses do not provide them", () => {
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel executions={[{ key: "base", displayLabel: "Base", genericAnalysis: rankingAnalysis() }]} visualizations={{ mode: "single", consensus: { enabled: false } }} /></ThemeProvider>);

    expect(screen.queryByText("Ranking stability")).not.toBeInTheDocument();
    expect(screen.queryByText("Ranking similarity between rounds")).not.toBeInTheDocument();
  });

  it("renders sorting relationships as category membership without ranking or score visualizations", () => {
    const categories = [
      { categoryId: "low", label: "Low", order: 0 },
      { categoryId: "medium", label: "Medium", order: 1 },
      { categoryId: "high", label: "High", order: 2 },
    ];
    const alternatives = [
      { alternativeId: "a", name: "Alpha", categoryId: "high", categoryLabel: "High" },
      { alternativeId: "b", name: "Balanced", categoryId: "medium", categoryLabel: "Medium" },
      { alternativeId: "c", name: "Budget", categoryId: "high", categoryLabel: "High" },
    ];
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{
        key: "sorting",
        resultStructureKey: "sorting",
        displayLabel: "TOPSIS-SORT",
        categoricalPhases: [{ phase: 5, categoryOrderSemantics: "lower-order-is-less-preferred", categories, alternatives }],
        genericAnalysis: { visualizations: [{ type: "alternativeRelationships", mode: "categorical", phases: [{ phase: 5, categoryOrderSemantics: "lower-order-is-less-preferred", categories, alternatives }] }] },
      }]}
      visualizations={{ mode: "single", consensus: { enabled: false } }}
    /></ThemeProvider>);

    expect(screen.getByTestId("categorical-relationship-matrix")).toBeInTheDocument();
    expect(screen.getAllByText("Same category: High")).toHaveLength(2);
    expect(screen.getAllByText("Different categories").length).toBeGreaterThan(0);
    expect(screen.getByTestId("categorical-category-order")).toHaveTextContent("Low → Medium → High");
    expect(screen.getByTestId("visualization-reading-guide")).toHaveTextContent(/does not imply identical underlying evaluations/);
    expect(screen.queryByText("Ranking evolution")).not.toBeInTheDocument();
    expect(screen.queryByText("Ranking stability")).not.toBeInTheDocument();
    expect(screen.queryByTestId("alternative-relationships-heatmap")).not.toBeInTheDocument();
  });

  it("shows cross-execution assignment changes only when the workspace provides a comparable category configuration", () => {
    const categories = [{ categoryId: "low", label: "Low", order: 0 }, { categoryId: "high", label: "High", order: 1 }];
    const phases = [{ phase: 1, categoryOrderSemantics: "lower-order-is-less-preferred", categories, alternatives: [
      { alternativeId: "a", name: "Alpha", categoryId: "high", categoryLabel: "High" },
      { alternativeId: "b", name: "Balanced", categoryId: "low", categoryLabel: "Low" },
    ] }];
    const genericAnalysis = { visualizations: [{ type: "alternativeRelationships", mode: "categorical", phases }] };
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel
      executions={[{ key: "base", resultStructureKey: "sorting", displayLabel: "Base", categoricalPhases: phases, genericAnalysis }, { key: "scenario", resultStructureKey: "sorting", displayLabel: "Scenario", categoricalPhases: phases, genericAnalysis }]}
      categoricalComparisons={[{ leftKey: "base", rightKey: "scenario", changes: [{ alternativeId: "a", name: "Alpha", fromCategoryLabel: "High", toCategoryLabel: "Low" }], unchanged: [] }]}
      visualizations={{ mode: "single", consensus: { enabled: false } }}
    /></ThemeProvider>);

    expect(screen.getByTestId("categorical-execution-comparisons")).toHaveTextContent("Base → Scenario");
    expect(screen.getByTestId("categorical-execution-comparisons")).toHaveTextContent("Alpha: High → Low");
  });

  it("places both secondary visualizations side by side for one execution", () => {
    const genericAnalysis = { visualizations: [{ type: "rankingStability", alternatives: [] }, { type: "rankingAgreement", transitions: [{ fromPhase: 0, toPhase: 1, coefficient: 0 }] }] };
    render(<ThemeProvider theme={createTheme()}><VisualizationsPanel executions={[{ key: "base", displayLabel: "Base", genericAnalysis }]} visualizations={{ mode: "single", consensus: { enabled: false } }} /></ThemeProvider>);
    expect(screen.getByTestId("secondary-visualizations-single-layout")).toBeInTheDocument();
    expect(screen.getByText(/Best and Worst show the smallest and largest rank numbers/)).toBeInTheDocument();
    expect(screen.getByText(/near 1 means the order stayed alike/)).toBeInTheDocument();
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
