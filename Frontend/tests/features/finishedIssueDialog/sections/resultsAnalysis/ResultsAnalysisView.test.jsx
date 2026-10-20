import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/VisualizationsPanel", () => ({ default: () => <div>Visualizations panel</div> }));
vi.mock("../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/InterpretationPanel", () => ({ default: () => <div>Interpretation panel</div> }));

import ResultsAnalysisView from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/ResultsAnalysisView.jsx";
import { useFinishedIssueResultsSelection } from "../../../../../src/features/finishedIssueDialog/hooks/useFinishedIssueResultsSelection.js";

const data = {
  selection: { label: "Viewing 1 execution", canAddMore: true },
  selected: [{ key: "base", displayLabel: "Base", fullLabel: "Base", color: "#fff" }],
  selectableOptions: [
    { key: "base", displayLabel: "Base", selectable: true },
    { key: "scenario", displayLabel: "Scenario A", selectable: true },
  ],
  visualizations: {},
};

const selection = {
  selectedExecutionKeys: ["base"],
  toggleExecution: vi.fn(),
  removeExecution: vi.fn(),
};

describe("ResultsAnalysisView", () => {
  ["visualizations", "interpretation"].forEach((activeView) => {
    it(`renders the shared execution toolbar and selection in ${activeView}`, async () => {
      const user = userEvent.setup();
      const toggleExecution = vi.fn();
      render(<ResultsAnalysisView data={data} selection={{ ...selection, toggleExecution }} navigation={{ activeView, setActiveView: vi.fn() }} genericAnalysis={{}} />);

      expect(screen.getByText("Viewing 1 execution")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /executions/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Visualizations" })).toHaveAttribute("aria-selected", String(activeView === "visualizations"));
      expect(screen.getByRole("tab", { name: "Interpretation" })).toHaveAttribute("aria-selected", String(activeView === "interpretation"));
      expect(screen.queryByRole("tab", { name: "Outcome" })).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Executions" }));
      const scenarioOption = screen.getByRole("menuitem", { name: /Scenario A/ });
      expect(within(scenarioOption).getByRole("checkbox")).toBeEnabled();
      await user.click(scenarioOption);
      expect(toggleExecution).toHaveBeenCalledWith("scenario");
    });
  });

  it("falls back to Visualizations for stale removed view state", () => {
    render(<ResultsAnalysisView data={data} selection={selection} navigation={{ activeView: "outcome", setActiveView: vi.fn() }} />);

    expect(screen.getByRole("tab", { name: "Visualizations" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", { name: "Outcome" })).not.toBeInTheDocument();
    expect(screen.getByText("Visualizations panel")).toBeInTheDocument();
    expect(screen.queryByText("Outcome panel")).not.toBeInTheDocument();
  });

  it("shows a capability message and no charts when the selected result disables Results Analysis", () => {
    render(<ResultsAnalysisView
      data={{
        ...data,
        analysisAvailable: false,
        analysisUnavailableReason: "Results Analysis is not available for sorting@1.",
        selected: [],
      }}
      selection={{ ...selection, selectedExecutionKeys: [] }}
      navigation={{ activeView: "visualizations", setActiveView: vi.fn() }}
    />);

    expect(screen.getByTestId("results-analysis-unavailable")).toHaveTextContent("Results Analysis is not available for sorting@1.");
    expect(screen.queryByText("Visualizations panel")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload analysis" })).toBeDisabled();
  });

  it("preserves execution selection while switching between the remaining views", async () => {
    const user = userEvent.setup();
    const SelectionHarness = () => {
      const selectionState = useFinishedIssueResultsSelection({
        issueId: "issue",
        executionOptions: data.selectableOptions,
      });
      const [activeView, setActiveView] = useState("visualizations");
      const selected = selectionState.selectedExecutionKeys.map((key) => ({
        key,
        displayLabel: key === "base" ? "Base" : "Scenario A",
        fullLabel: key === "base" ? "Base" : "Scenario A",
        color: key === "base" ? "#fff" : "#0f0",
      }));

      return <ResultsAnalysisView
        data={{
          ...data,
          selected,
          selection: {
            label: selected.length === 1 ? "Viewing 1 execution" : `Comparing ${selected.length} executions`,
            canAddMore: selected.length < 3,
          },
        }}
        selection={selectionState}
        navigation={{ activeView, setActiveView }}
      />;
    };

    render(<SelectionHarness />);
    await user.click(screen.getByRole("button", { name: "Executions" }));
    await user.click(screen.getByRole("menuitem", { name: /Scenario A/ }));
    await user.keyboard("{Escape}");
    expect(screen.getByText("Comparing 2 executions")).toBeInTheDocument();
    expect(screen.getAllByText("Scenario A")).toHaveLength(1);

    await user.click(screen.getByRole("tab", { name: "Interpretation" }));
    expect(screen.getByText("Comparing 2 executions")).toBeInTheDocument();
    expect(screen.getAllByText("Scenario A")).toHaveLength(1);

    await user.click(screen.getByRole("tab", { name: "Visualizations" }));
    expect(screen.getByText("Comparing 2 executions")).toBeInTheDocument();
    expect(screen.getAllByText("Scenario A")).toHaveLength(1);
  });

  it("keeps execution identity visible when comparing multiple executions", () => {
    render(<ResultsAnalysisView
      data={{ ...data, selection: { ...data.selection, label: "Comparing 2 executions" }, selected: [...data.selected, { key: "scenario", displayLabel: "Scenario A", fullLabel: "Scenario A", color: "#0f0" }] }}
      selection={{ ...selection, selectedExecutionKeys: ["base", "scenario"] }}
      navigation={{ activeView: "visualizations", setActiveView: vi.fn() }}
    />);

    expect(screen.getByText("Base")).toBeInTheDocument();
    expect(screen.getByText("Scenario A")).toBeInTheDocument();
  });
});
