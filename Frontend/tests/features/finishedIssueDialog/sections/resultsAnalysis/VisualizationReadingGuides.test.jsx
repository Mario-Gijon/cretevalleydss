import { ThemeProvider, createTheme } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import VisualizationsPanel from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/VisualizationsPanel.jsx";
import { getVisualizationReadingGuide } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/visualizationReadingGuides.js";

const cellData = { rows: [{ key: "alternative", label: "Alternative" }], columns: [{ key: "criterion", label: "Criterion" }], values: [[0.4]] };
const descriptor = (key, title, insight) => ({ key, type: "heatmap", title, description: { legacy: "not readable" }, insight, data: cellData });

const renderPanel = (executions) => render(
  <ThemeProvider theme={createTheme()}>
    <VisualizationsPanel executions={executions} visualizations={{ mode: "single", consensus: { enabled: false } }} />
  </ThemeProvider>,
);

const expectTitleGuideChartOrder = (graph) => {
  const title = graph.querySelector("h3");
  const guide = graph.querySelector('[data-testid="visualization-reading-guide"]');
  const chart = graph.querySelector('[data-testid="heatmap-analytical-graph"]');
  expect(title).toBeInTheDocument();
  expect(guide).toBeInTheDocument();
  expect(chart).toBeInTheDocument();
  expect(title.compareDocumentPosition(guide) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(guide.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
};

describe("reading guides in Finished Issue visualizations", () => {
  it("explains generic alternative separation without describing it as superiority", () => {
    const relationshipGuide = getVisualizationReadingGuide({ type: "alternativeRelationships" });

    expect(relationshipGuide.title).toBe("Alternative relationships");
    expect(relationshipGuide.text).toContain("relative to the observed score range for this execution");
    expect(relationshipGuide.text).toContain("not a percentage of superiority or preference");
    expect(relationshipGuide.text).toContain("do not compare values across executions or models");
  });

  it("keeps a separate explanation on each chart in a paired layout", () => {
    renderPanel([{
      key: "base",
      displayLabel: "Base execution",
      alternativeEvaluationAnalysis: { analysis: { sections: [{
        id: "paired-model-diagnostics",
        title: "Model diagnostics",
        order: 0,
        visualizations: [
          descriptor("mcc-adjustment-map", "Weight changes by expert and criterion", "A result-specific adjustment conclusion."),
          descriptor("two-tuple-alpha-heatmap", "Symbolic translation α", "A result-specific translation conclusion."),
        ],
      }] } },
    }]);

    expect(screen.getAllByTestId("semantic-section-pane-row")).toHaveLength(1);
    expect(screen.getAllByTestId("semantic-section-pane-divider")).toHaveLength(1);
    const graphs = screen.getAllByTestId("analytical-graph-heatmap");
    expect(graphs[0].querySelector("h3")).toHaveTextContent("Weight changes by expert and criterion");
    expect(graphs[0].querySelector('[data-testid="visualization-reading-guide"]')).toHaveTextContent("positive means raised");
    expect(graphs[0].querySelector('[data-testid="visualization-reading-guide"]')).toHaveTextContent("does not show a change in the expert's stated preference");
    expect(graphs[1].querySelector("h3")).toHaveTextContent("Symbolic translation α");
    expect(graphs[1].querySelector('[data-testid="visualization-reading-guide"]')).toHaveTextContent("not confidence or uncertainty");
    expectTitleGuideChartOrder(graphs[0]);
    expectTitleGuideChartOrder(graphs[1]);
    expect(screen.queryByText("A result-specific adjustment conclusion.")).not.toBeInTheDocument();
    expect(screen.queryByText("A result-specific translation conclusion.")).not.toBeInTheDocument();
  });

  it("explains collective weights and adjustment totals in plain language", () => {
    const collectiveGuide = getVisualizationReadingGuide({ key: "collective-criterion-importance" });
    const expertAdjustmentGuide = getVisualizationReadingGuide({ key: "mcc-adjustment-effort-by-expert" });
    const criterionAdjustmentGuide = getVisualizationReadingGuide({ key: "mcc-adjustment-effort-by-criterion" });

    expect(collectiveGuide.title).toBe("Collective criterion importance");
    expect(collectiveGuide.text).toContain("final collective weight as a percentage");
    expect(collectiveGuide.text).toContain("does not show how many experts ranked it first");
    expect(expertAdjustmentGuide.title).toBe("Weight adjustment by expert");
    expect(expertAdjustmentGuide.text).toContain("not greater agreement");
    expect(criterionAdjustmentGuide.title).toBe("Weight adjustment by criterion");
    expect(criterionAdjustmentGuide.text).toContain("Increases and decreases both add to the total");
  });

  it("shows the same semantic guide independently for each execution in comparison columns", () => {
    renderPanel([
      { key: "base", displayLabel: "Base", alternativeEvaluationAnalysis: { analysis: { visualizations: [descriptor("collective-beta-heatmap", "Base collective positions", "Base-only conclusion.")] } } },
      { key: "scenario", displayLabel: "Scenario", alternativeEvaluationAnalysis: { analysis: { visualizations: [descriptor("collective-beta-heatmap", "Scenario collective positions", "Scenario-only conclusion.")] } } },
    ]);

    const graphs = screen.getAllByTestId("analytical-graph-heatmap");
    expect(graphs).toHaveLength(2);
    expect(graphs[0].querySelector("h3")).toHaveTextContent("Base collective positions");
    expect(graphs[1].querySelector("h3")).toHaveTextContent("Scenario collective positions");
    graphs.forEach((graph) => {
      expect(graph.querySelector('[data-testid="visualization-reading-guide"]')).toHaveTextContent("position (β)");
      expectTitleGuideChartOrder(graph);
    });
    expect(screen.getByText("Base")).toBeInTheDocument();
    expect(screen.getByText("Scenario")).toBeInTheDocument();
    expect(screen.queryByText("Base-only conclusion.")).not.toBeInTheDocument();
    expect(screen.queryByText("Scenario-only conclusion.")).not.toBeInTheDocument();
  });
});
