import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { describe, expect, it, vi } from "vitest";

vi.mock("@mui/x-charts/BarChart", () => ({
  BarChart: ({ xAxis, series }) => <div data-testid="score-overview-chart" data-axis={JSON.stringify(xAxis)} data-values={JSON.stringify(series[0]?.data)} />,
}));

import { useFinishedIssueResultsSelection } from "../../../../../src/features/finishedIssueDialog/hooks/useFinishedIssueResultsSelection.js";
import { buildResultsAnalysisWorkspaceData } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/buildResultsAnalysisWorkspaceData.js";
import ScoreOverviewChart from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/ScoreOverviewChart.jsx";
import { scoreChartContainerSx, scoreChartViewportSx, scoreOverviewPanelSx, singleOutcomeGridSx } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/resultsAnalysis.styles.js";
import { buildFinishedIssuePayloadFixture } from "../../../../mocks/fixtures/finishedIssueDialog.fixtures.js";

const completeScenario = (id, ranks) => ({
  id,
  name: id,
  status: "completed",
  targetModel: { id: `model-${id}`, name: `Model ${id}` },
  outputs: {
    standardResult: {
      rankedAlternatives: ranks.map(([alternativeId, rank, score]) => ({ alternativeId, rank, score })),
      plotsGraphic: {},
    },
  },
});

describe("Results analysis workspace", () => {
  it("resolves the latest base evaluation, keeps every ranking entry, and excludes failed runs", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.scenarios = [
      completeScenario("scenario-forward", [["a", 1, -1.4], ["b", 2, -2.1]]),
      { ...payload.scenarios[1] },
    ];
    const snapshot = JSON.stringify(payload);

    const data = buildResultsAnalysisWorkspaceData({ payload, selectedExecutionKeys: ["base", "scenario-forward"] });

    expect(data.selected[0].sourcePhase).toBe(5);
    expect(data.selected[0].ranking.map((entry) => entry.name)).toEqual(["Beta", "Alpha"]);
    expect(data.selected[1].ranking.map((entry) => entry.score)).toEqual([-1.4, -2.1]);
    expect(data.selectableOptions.find((option) => option.key === "scenario-error")).toMatchObject({ selectable: false, unavailableReason: "Model unavailable" });
    expect(JSON.stringify(payload)).toBe(snapshot);
  });

  it("builds factual rank movement and Spearman correlation from stable alternative ids", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.scenarios = [
      completeScenario("scenario-reverse", [["a", 1, 0.8], ["b", 2, 0.2]]),
      completeScenario("scenario-identical", [["b", 1, 4], ["a", 2, 1]]),
    ];

    const data = buildResultsAnalysisWorkspaceData({ payload, selectedExecutionKeys: ["base", "scenario-reverse", "scenario-identical"] });
    const cells = new Map(data.comparison.correlations.cells.map((cell) => [`${cell.rowKey}:${cell.columnKey}`, cell.value]));

    expect(data.comparison.movement).toMatchObject({ available: true, maxPosition: 2 });
    expect(data.comparison.movement.alternatives).toHaveLength(2);
    expect(cells.get("base:scenario-reverse")).toBe(-1);
    expect(cells.get("base:scenario-identical")).toBe(1);
    expect(cells.get("base:base")).toBe(1);
  });

  it("keeps an ordered 1–3 selection, blocks unavailable executions, and promotes the new primary", async () => {
    const selectGlobalExecution = vi.fn();
    const options = [
      { key: "base", selectable: true },
      { key: "scenario-a", selectable: true },
      { key: "scenario-b", selectable: true },
      { key: "scenario-error", selectable: false },
    ];
    const { result } = renderHook(() => useFinishedIssueResultsSelection({ issueId: "issue-1", executionOptions: options, selectGlobalExecution }));

    await waitFor(() => expect(result.current.selectedExecutionKeys).toEqual(["base"]));
    act(() => result.current.addExecution("scenario-a"));
    act(() => result.current.addExecution("scenario-b"));
    act(() => result.current.addExecution("scenario-error"));
    expect(result.current.selectedExecutionKeys).toEqual(["base", "scenario-a", "scenario-b"]);
    act(() => result.current.removeExecution("base"));
    await waitFor(() => expect(result.current.selectedExecutionKeys).toEqual(["scenario-a", "scenario-b"]));
    expect(selectGlobalExecution).toHaveBeenLastCalledWith("scenario-a");
  });

  it("uses a stretched single-outcome grid and a flexible score-panel chart body", () => {
    expect(singleOutcomeGridSx.alignItems).toBe("stretch");
    expect(scoreOverviewPanelSx).toMatchObject({ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 });
    expect(scoreChartViewportSx).toMatchObject({ flex: 1, display: "flex", minHeight: { xs: 320, md: 0 }, overflowX: "auto", overflowY: "hidden" });
    expect(scoreChartContainerSx(900)).toMatchObject({ minWidth: 900, width: "100%", flex: 1, height: "100%", minHeight: { xs: 320, md: 360 } });
  });

  it("passes every alternative, including negative, zero, and missing scores, to the chart", () => {
    render(<ThemeProvider theme={createTheme()}><ScoreOverviewChart ranking={[{ id: "a", name: "Alpha", score: -1, formattedScore: "-1", position: 1 }, { id: "b", name: "Beta", score: 0, formattedScore: "0", position: 2 }, { id: "c", name: "Gamma", score: null, formattedScore: "—", position: 3 }]} /></ThemeProvider>);
    const chart = screen.getByTestId("score-overview-chart");
    expect(JSON.parse(chart.dataset.axis)[0].data).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(JSON.parse(chart.dataset.values)).toEqual([-1, 0, null]);
    expect(screen.getByText("Scores are shown in the original scale of this execution.")).toBeInTheDocument();
    expect(chart.compareDocumentPosition(screen.getByText("Scores are shown in the original scale of this execution.")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
