import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { describe, expect, it, vi } from "vitest";

vi.mock("@mui/x-charts/BarChart", () => ({
  BarChart: ({ height, series, xAxis, borderRadius, barLabel, axisHighlight, slotProps }) => <div data-testid="score-overview-chart" data-axis={JSON.stringify(xAxis)} data-axis-highlight={JSON.stringify(axisHighlight)} data-height={height} data-series={JSON.stringify(series)} data-radius={borderRadius} data-label={barLabel?.({ value: 1 })} data-tooltip-trigger={slotProps?.tooltip?.trigger} />,
}));

import { useFinishedIssueResultsSelection } from "../../../../../src/features/finishedIssueDialog/hooks/useFinishedIssueResultsSelection.js";
import { buildResultsAnalysisWorkspaceData } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/buildResultsAnalysisWorkspaceData.js";
import ScoreOverviewChart from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/ScoreOverviewChart.jsx";
import RankingList from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/RankingList.jsx";
import { getScoreOverviewChartHeight } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/scoreOverviewChartHeight.js";
import { buildScoreOverviewSeries } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/buildScoreOverviewSeries.js";
import { comparisonOutcomeGridSx, rankingListViewportSx, scoreChartContainerSx, scoreChartViewportSx, scoreOverviewPanelSx, singleOutcomeGridSx } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/resultsAnalysis.styles.js";
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
  it("uses blue, green, and purple Results Analysis slots in selection order", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.scenarios = [completeScenario("scenario-forward", [["a", 1, 1], ["b", 2, 0]]), completeScenario("scenario-reverse", [["b", 1, 1], ["a", 2, 0]])];
    const data = buildResultsAnalysisWorkspaceData({ payload, selectedExecutionKeys: ["scenario-forward", "base", "scenario-reverse"] });
    expect(data.selected.map((entry) => entry.color)).toEqual(["#27d5e4", "#6fdc68", "#a960e8"]);
  });
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

  it("uses short Results Analysis labels while retaining full scenario labels for detail", () => {
    const payload = buildFinishedIssuePayloadFixture();
    const topsis = completeScenario("scenario-topsis", [["a", 1, 1], ["b", 2, 0]]);
    topsis.name = "TOPSIS v2";
    topsis.targetModel.name = "TOPSIS";
    payload.scenarios = [topsis];
    const data = buildResultsAnalysisWorkspaceData({ payload, selectedExecutionKeys: ["base", "scenario-topsis"] });
    expect(data.selected[0].shortLabel).toContain("Base ·");
    expect(data.selected[1]).toMatchObject({ shortLabel: "TOPSIS v2", displayLabel: "TOPSIS v2", fullLabel: "TOPSIS v2 · TOPSIS", modelName: "TOPSIS" });
  });

  it("disambiguates only duplicate scenario names in the shared workspace", () => {
    const payload = buildFinishedIssuePayloadFixture();
    const first = completeScenario("scenario-a", [["a", 1, 1], ["b", 2, 0]]);
    const second = completeScenario("scenario-b", [["a", 1, 1], ["b", 2, 0]]);
    first.name = second.name = "Test";
    first.targetModel.name = "TOPSIS";
    second.targetModel.name = "BORDA";
    payload.scenarios = [first, second];
    const data = buildResultsAnalysisWorkspaceData({ payload, selectedExecutionKeys: ["scenario-a", "scenario-b"] });
    expect(data.selected.map((entry) => entry.displayLabel)).toEqual(["Test · TOPSIS", "Test · BORDA"]);
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
    expect(data.interpretation).toMatchObject({ mode: "comparison", selected: data.selected, primary: data.primary });
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

  it("uses functional selection updates for rapid changes and never leaves the workspace empty", async () => {
    const options = [{ key: "base", selectable: true }, { key: "scenario-a", selectable: true }, { key: "scenario-b", selectable: true }];
    const { result } = renderHook(() => useFinishedIssueResultsSelection({ issueId: "issue-1", executionOptions: options }));
    await waitFor(() => expect(result.current.selectedExecutionKeys).toEqual(["base"]));
    act(() => {
      result.current.addExecution("scenario-a");
      result.current.addExecution("scenario-b");
    });
    expect(result.current.selectedExecutionKeys).toEqual(["base", "scenario-a", "scenario-b"]);
    act(() => {
      result.current.removeExecution("base");
      result.current.removeExecution("scenario-a");
      result.current.removeExecution("scenario-b");
    });
    expect(result.current.selectedExecutionKeys).toEqual(["scenario-b"]);
  });

  it("uses a stretched single-outcome grid and a flexible score-panel chart body", () => {
    expect(singleOutcomeGridSx.alignItems).toBe("stretch");
    expect(scoreOverviewPanelSx).toMatchObject({ display: "flex", flexDirection: "column", minWidth: 0 });
    expect(scoreChartViewportSx).toMatchObject({ width: "100%", overflowX: "auto", overflowY: "hidden" });
    expect(scoreChartViewportSx.flex).toBeUndefined();
    expect(scoreChartContainerSx(900, 380)).toMatchObject({ minWidth: 900, width: "100%", flex: "0 0 auto", height: 380, minHeight: 380, maxHeight: 380 });
    expect(rankingListViewportSx(false).maxHeight).toEqual({ xs: 520, xl: 380 });
    expect(comparisonOutcomeGridSx).toMatchObject({ gridTemplateColumns: { lg: "minmax(0, 1.35fr) minmax(340px, 0.65fr)" } });
    expect(comparisonOutcomeGridSx["& > :first-of-type"].gridColumn.lg).toBe("1 / -1");
  });

  it("uses stable bounded responsive numeric chart heights without creating a ResizeObserver", () => {
    expect(getScoreOverviewChartHeight({ isMobile: true, isDesktop: false })).toBe(320);
    expect(getScoreOverviewChartHeight({ isMobile: false, isDesktop: false })).toBe(340);
    expect(getScoreOverviewChartHeight({ isMobile: false, isDesktop: true })).toBe(380);
    const originalResizeObserver = globalThis.ResizeObserver;
    const resizeObserver = vi.fn();
    globalThis.ResizeObserver = resizeObserver;
    render(<ThemeProvider theme={createTheme()}><ScoreOverviewChart ranking={[{ id: "a", name: "Alpha", score: 1, formattedScore: "1", position: 1 }]} /></ThemeProvider>);
    expect(resizeObserver).not.toHaveBeenCalled();
    globalThis.ResizeObserver = originalResizeObserver;
  });

  it("passes the bounded numeric height while preserving every score value", () => {
    const { rerender } = render(<ThemeProvider theme={createTheme()}><ScoreOverviewChart ranking={[{ id: "a", name: "Alpha", score: -1, formattedScore: "-1", position: 1 }, { id: "b", name: "Beta", score: 0, formattedScore: "0", position: 2 }, { id: "c", name: "Gamma", score: null, formattedScore: "—", position: 3 }]} /></ThemeProvider>);
    const chart = screen.getByTestId("score-overview-chart");
    expect(JSON.parse(chart.dataset.axis)[0].data).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(JSON.parse(chart.dataset.series).map((series) => series.data)).toEqual([[-1, null, null], [null, 0, null], [null, null, null]]);
    expect(Number(chart.dataset.radius)).toBe(4);
    expect(Number(chart.dataset.height)).toBeGreaterThanOrEqual(300);
    expect(Number(chart.dataset.height)).toBeLessThanOrEqual(400);
    expect(JSON.parse(chart.dataset.axisHighlight)).toEqual({ x: "none", y: "none" });
    expect(chart.dataset.tooltipTrigger).toBe("none");
    rerender(<ThemeProvider theme={createTheme()}><ScoreOverviewChart ranking={[{ id: "a", name: "Alpha", score: -1, formattedScore: "-1", position: 1 }, { id: "b", name: "Beta", score: 0, formattedScore: "0", position: 2 }, { id: "c", name: "Gamma", score: null, formattedScore: "—", position: 3 }]} /></ThemeProvider>);
    expect(Number(screen.getByTestId("score-overview-chart").dataset.height)).toBe(Number(chart.dataset.height));
    expect(screen.getByText("Scores are shown in the original scale of this execution.")).toBeInTheDocument();
    expect(chart.compareDocumentPosition(screen.getByText("Scores are shown in the original scale of this execution.")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("preserves internal chart width for ten alternatives", () => {
    const ranking = Array.from({ length: 10 }, (_, index) => ({ id: `a-${index}`, name: `Alternative ${index + 1}`, score: index, formattedScore: String(index), position: index + 1 }));
    render(<ThemeProvider theme={createTheme()}><ScoreOverviewChart ranking={ranking} /></ThemeProvider>);
    const chart = screen.getByTestId("score-overview-chart");
    expect(JSON.parse(chart.dataset.axis)[0].data).toHaveLength(10);
    expect(scoreChartContainerSx(900, 380).minWidth).toBe(900);
  });

  it("uses Dashboard-style colors for every highest finite score, including ties and negatives", () => {
    const tied = buildScoreOverviewSeries([{ id: "a", name: "A", score: 0.8 }, { id: "b", name: "B", score: 0.8 }, { id: "c", name: "C", score: 0.4 }]);
    expect(tied.map((series) => series.color)).toEqual(["rgba(72, 190, 130, 0.82)", "rgba(72, 190, 130, 0.82)", "rgba(52, 139, 218, 0.78)"]);
    const negative = buildScoreOverviewSeries([{ id: "a", name: "A", score: -0.2 }, { id: "b", name: "B", score: -0.5 }, { id: "c", name: "C", score: -0.2 }, { id: "d", name: "D", score: null }]);
    expect(negative.map((series) => series.color)).toEqual(["rgba(72, 190, 130, 0.82)", "rgba(52, 139, 218, 0.78)", "rgba(72, 190, 130, 0.82)", "rgba(52, 139, 218, 0.78)"]);
    expect(negative[3].data).toEqual([null, null, null, null]);
  });

  it("keeps the first-ranked row emphasis without a Winner badge", () => {
    render(<ThemeProvider theme={createTheme()}><RankingList ranking={[{ id: "a", name: "Alpha", position: 1, score: 1, formattedScore: "1" }]} /></ThemeProvider>);
    expect(screen.queryByText("Winner")).not.toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });
});
