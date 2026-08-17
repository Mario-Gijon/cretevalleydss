import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/OutcomePanel", () => ({ default: () => <div>Outcome panel</div> }));
vi.mock("../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/VisualizationsPanel", () => ({ default: () => <div>Visualizations panel</div> }));
vi.mock("../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/InterpretationPanel", () => ({ default: () => <div>Interpretation panel</div> }));

import ResultsAnalysisView from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/ResultsAnalysisView.jsx";

const data = {
  selection: { label: "Viewing 1 execution", canAddMore: true },
  selected: [{ key: "base", displayLabel: "Base", fullLabel: "Base", color: "#fff" }],
  selectableOptions: [{ key: "base", displayLabel: "Base", selectable: true }],
  visualizations: {},
};

const selection = {
  selectedExecutionKeys: ["base"],
  toggleExecution: vi.fn(),
  removeExecution: vi.fn(),
};

describe("ResultsAnalysisView", () => {
  ["outcome", "visualizations", "interpretation"].forEach((activeView) => {
    it(`renders the shared execution toolbar in ${activeView}`, () => {
      render(<ResultsAnalysisView data={data} selection={selection} navigation={{ activeView, setActiveView: vi.fn() }} genericAnalysis={{}} scatterPlotRef={{ current: null }} onResetZoom={vi.fn()} />);

      expect(screen.getByText("Viewing 1 execution")).toBeInTheDocument();
      expect(screen.queryByText("Base")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /executions/i })).toBeInTheDocument();
    });
  });

  it("keeps execution identity visible when comparing multiple executions", () => {
    render(<ResultsAnalysisView
      data={{ ...data, selection: { ...data.selection, label: "Comparing 2 executions" }, selected: [...data.selected, { key: "scenario", displayLabel: "Scenario A", fullLabel: "Scenario A", color: "#0f0" }] }}
      selection={{ ...selection, selectedExecutionKeys: ["base", "scenario"] }}
      navigation={{ activeView: "outcome", setActiveView: vi.fn() }}
    />);

    expect(screen.getByText("Base")).toBeInTheDocument();
    expect(screen.getByText("Scenario A")).toBeInTheDocument();
  });
});
