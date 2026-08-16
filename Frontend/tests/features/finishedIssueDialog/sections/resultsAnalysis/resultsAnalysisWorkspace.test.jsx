import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { describe, expect, it, vi } from "vitest";

vi.mock("@mui/x-charts/BarChart", () => ({
  BarChart: ({ height, series, xAxis, borderRadius, barLabel, axisHighlight, slotProps }) => <div data-testid="score-overview-chart" data-axis={JSON.stringify(xAxis)} data-axis-highlight={JSON.stringify(axisHighlight)} data-height={height} data-series={JSON.stringify(series)} data-radius={borderRadius} data-label={barLabel?.({ value: 1 })} data-tooltip-trigger={slotProps?.tooltip?.trigger} />,
}));

import { useFinishedIssueResultsSelection } from "../../../../../src/features/finishedIssueDialog/hooks/useFinishedIssueResultsSelection.js";
import { buildResultsAnalysisWorkspaceData } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/buildResultsAnalysisWorkspaceData.js";
import ScoreOverviewChart from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/ScoreOverviewChart.jsx";
import FinalRankingPanel from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/FinalRankingPanel.jsx";
import RankingsByExecution from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/RankingsByExecution.jsx";
import RankingList from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/RankingList.jsx";
import RankingCorrelationMatrix from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/RankingCorrelationMatrix.jsx";
import RankingMovementChart from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/RankingMovementChart.jsx";
import { getScoreOverviewChartHeight } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/scoreOverviewChartHeight.js";
import { buildScoreOverviewSeries } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/buildScoreOverviewSeries.js";
import { normalizeRankingScores } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/normalizeRankingScores.js";
import { buildConsensusEvolutionData } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/buildConsensusEvolutionData.js";
import { comparisonDetailPanelSx, comparisonOutcomeGridSx, correlationCellSx, correlationMatrixSx, correlationMatrixViewportSx, movementChartViewportSx, rankingListViewportSx, rankingScoreTrackSx, scoreChartContainerSx, scoreChartViewportSx, scoreOverviewPanelSx, singleOutcomeGridSx } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/resultsAnalysis.styles.js";
import { buildFinishedIssuePayloadFixture } from "../../../../mocks/fixtures/finishedIssueDialog.fixtures.js";

const completeScenario = (id, ranks) => ({
  id,
  name: id,
  targetModel: { id: `model-${id}`, name: `Model ${id}` },
  phaseResults: [{
    phase: 5,
    source: { stageResult: null, domainType: "numeric" },
    requestSnapshot: { modelParameters: {} },
    standardizedOutput: { rankedAlternatives: ranks.map(([alternativeId, rank, score]) => ({ alternativeId, rank, score })), plotsGraphic: {} },
    modelSpecificOutput: {},
    rawOutput: {},
    execution: { attemptId: `attempt-${id}`, startedAt: "2026-01-02T10:00:00.000Z", completedAt: "2026-01-02T10:00:00.000Z" },
  }],
});

describe("Results analysis workspace", () => {
  it("normalizes ranking scores without mutating the original entries", () => {
    const ranking = [
      { id: "positive-low", score: 10, formattedScore: "10", position: 1 },
      { id: "positive-high", score: 30, formattedScore: "30", position: 2 },
      { id: "mixed-low", score: -5, formattedScore: "-5", position: 3 },
      { id: "missing", score: null, formattedScore: "—", position: 4 },
      { id: "invalid", score: Number.NaN, formattedScore: "NaN", position: 5 },
      { id: "infinite", score: Infinity, formattedScore: "∞", position: 6 },
    ];
    const original = ranking.map((entry) => ({ ...entry }));

    const normalized = normalizeRankingScores(ranking);

    expect(normalized.map((entry) => [entry.id, entry.score, entry.formattedScore])).toEqual([
      ["positive-low", 0.42857142857142855, "0.4286"],
      ["positive-high", 1, "1"],
      ["mixed-low", 0, "0"],
      ["missing", null, "—"],
      ["invalid", null, "—"],
      ["infinite", null, "—"],
    ]);
    expect(ranking).toEqual(original);
    expect(normalized[0]).not.toBe(ranking[0]);
  });

  it("normalizes equal finite scores to one and keeps unavailable scores unavailable", () => {
    expect(normalizeRankingScores([
      { id: "a", score: -2, formattedScore: "-2" },
      { id: "b", score: -2, formattedScore: "-2" },
      { id: "c", formattedScore: "—" },
    ]).map((entry) => [entry.score, entry.formattedScore])).toEqual([[1, "1"], [1, "1"], [null, "—"]]);
  });

  it("keeps comparison scores original by default and normalizes each execution independently when enabled", () => {
    const executions = [
      { key: "first", color: "#27d5e4", displayLabel: "First", fullLabel: "First", available: true, ranking: [{ id: "a", name: "Alpha", position: 1, score: 10, formattedScore: "10" }, { id: "b", name: "Beta", position: 2, score: 20, formattedScore: "20" }] },
      { key: "second", color: "#6fdc68", displayLabel: "Second", fullLabel: "Second", available: true, ranking: [{ id: "a", name: "Alpha", position: 1, score: -5, formattedScore: "-5" }, { id: "b", name: "Beta", position: 2, score: 5, formattedScore: "5" }] },
    ];
    render(<ThemeProvider theme={createTheme()}><RankingsByExecution executions={executions} /></ThemeProvider>);
    const toggle = screen.getByRole("button", { name: "Normalize values" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("-5")).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("20")).not.toBeInTheDocument();
    expect(screen.queryByText("-5")).not.toBeInTheDocument();
    expect(screen.getAllByText("0", { selector: "p" })).toHaveLength(2);
    expect(screen.getAllByText("1", { selector: "p" })).toHaveLength(2);

    fireEvent.click(toggle);
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("-5")).toBeInTheDocument();
  });

  it("keeps the Score Overview original by default and switches its series and footer when normalized", () => {
    const ranking = [{ id: "a", name: "Alpha", score: -5, formattedScore: "-5", position: 1 }, { id: "b", name: "Beta", score: 5, formattedScore: "5", position: 2 }];
    render(<ThemeProvider theme={createTheme()}><ScoreOverviewChart ranking={ranking} /></ThemeProvider>);
    const toggle = screen.getByRole("button", { name: "Normalize values" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(JSON.parse(screen.getByTestId("score-overview-chart").dataset.series).map((series) => series.data)).toEqual([[-5, null], [null, 5]]);
    expect(screen.getByText("Scores are shown in the original scale of this execution.")).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(JSON.parse(screen.getByTestId("score-overview-chart").dataset.series).map((series) => series.data)).toEqual([[0, null], [null, 1]]);
    expect(screen.getByText("Scores are normalized from 0 to 1 within this execution.")).toBeInTheDocument();
    expect(screen.queryByText("Scores are shown in the original scale of this execution.")).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(JSON.parse(screen.getByTestId("score-overview-chart").dataset.series).map((series) => series.data)).toEqual([[-5, null], [null, 5]]);
    expect(screen.getByText("Scores are shown in the original scale of this execution.")).toBeInTheDocument();
  });

  it("uses blue, green, and purple Results Analysis slots in selection order", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.scenarios = [completeScenario("scenario-forward", [["a", 1, 1], ["b", 2, 0]]), completeScenario("scenario-reverse", [["b", 1, 1], ["a", 2, 0]])];
    const data = buildResultsAnalysisWorkspaceData({ payload, selectedExecutionKeys: ["scenario-forward", "base", "scenario-reverse"] });
    expect(data.selected.map((entry) => entry.color)).toEqual(["#27d5e4", "#6fdc68", "#a960e8"]);
  });
  it("resolves the latest base evaluation and keeps every ranking entry", () => {
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
    expect(data.selectableOptions.find((option) => option.key === "scenario-secondary")).toMatchObject({ selectable: true });
    expect(JSON.stringify(payload)).toBe(snapshot);
  });

  it("uses the selected stored base phase consistently and falls back safely to the final phase", () => {
    const payload = buildFinishedIssuePayloadFixture();
    const initial = buildResultsAnalysisWorkspaceData({ payload, selectedExecutionKeys: ["base"], selectedPhase: 0 });
    const final = buildResultsAnalysisWorkspaceData({ payload, selectedExecutionKeys: ["base"], selectedPhase: 5 });
    const fallback = buildResultsAnalysisWorkspaceData({ payload, selectedExecutionKeys: ["base"], selectedPhase: 99 });
    const nullFallback = buildResultsAnalysisWorkspaceData({ payload, selectedExecutionKeys: ["base"], selectedPhase: null });

    expect(initial.primary).toMatchObject({ sourcePhase: 0, phaseLabel: "Initial", modelSpecificOutput: { token: "base-initial" }, rawOutput: { token: "base-initial-raw" }, consensusMeasure: 0.4 });
    expect(initial.primary.ranking.map((entry) => [entry.name, entry.score])).toEqual([["Alpha", 0.7], ["Beta", 0.3]]);
    expect(initial.visualizations.singleScatter).toMatchObject({ sourcePhase: 0, data: { 0: { collectivePoint: { x: -0.5, y: 0.25 } } } });
    expect(final.primary).toMatchObject({ sourcePhase: 5, phaseLabel: "Final (Round 1)", modelSpecificOutput: { token: "base" }, rawOutput: { token: "base-raw" }, consensusMeasure: 0.9 });
    expect(final.primary.ranking.map((entry) => [entry.name, entry.score])).toEqual([["Beta", 0.8], ["Alpha", 0.2]]);
    expect(final.visualizations.singleScatter).toMatchObject({ sourcePhase: 5, data: { 5: { collectivePoint: { x: 3.5, y: 1 } } } });
    expect(fallback.primary.sourcePhase).toBe(5);
    expect(nullFallback.primary.sourcePhase).toBe(5);
  });

  it("resolves the same selected phase for Base and scenario comparisons", () => {
    const payload = buildFinishedIssuePayloadFixture();
    const initial = buildResultsAnalysisWorkspaceData({ payload, selectedExecutionKeys: ["base", "scenario-ok"], selectedPhase: 0 });
    const final = buildResultsAnalysisWorkspaceData({ payload, selectedExecutionKeys: ["base", "scenario-ok"], selectedPhase: 5 });

    expect(initial.selected[0].ranking.map((entry) => entry.name)).toEqual(["Alpha", "Beta"]);
    expect(final.selected[0].ranking.map((entry) => entry.name)).toEqual(["Beta", "Alpha"]);
    expect(initial.selected[1]).toMatchObject({ sourcePhase: 0, standardizedOutput: payload.scenarios[0].phaseResults[0].standardizedOutput });
    expect(final.selected[1]).toMatchObject({ sourcePhase: 5, standardizedOutput: payload.scenarios[0].phaseResults[1].standardizedOutput });
    expect(initial.comparison.movement).not.toEqual(final.comparison.movement);
  });

  it("keeps the consensus evolution complete and labels every round with the shared formatter", () => {
    const graph = buildConsensusEvolutionData(buildFinishedIssuePayloadFixture()).graph;
    expect(graph).toEqual({ labels: ["Initial", "Final (Round 1)"], data: [0.4, 0.9] });
  });

  it("uses short Results Analysis labels while retaining full scenario labels for detail", () => {
    const payload = buildFinishedIssuePayloadFixture();
    const topsis = completeScenario("scenario-topsis", [["a", 1, 1], ["b", 2, 0]]);
    topsis.name = "TOPSIS v2";
    topsis.targetModel.name = "TOPSIS";
    payload.scenarios = [topsis];
    const data = buildResultsAnalysisWorkspaceData({ payload, selectedExecutionKeys: ["base", "scenario-topsis"] });
    expect(data.selected[0].shortLabel).toBe("Base");
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

  it("keeps an ordered 1–3 selection without changing the Models selection", async () => {
    const options = [
      { key: "base", selectable: true },
      { key: "scenario-a", selectable: true },
      { key: "scenario-b", selectable: true },
      { key: "scenario-c", selectable: true },
    ];
    const { result } = renderHook(() => useFinishedIssueResultsSelection({ issueId: "issue-1", executionOptions: options }));

    await waitFor(() => expect(result.current.selectedExecutionKeys).toEqual(["base"]));
    act(() => result.current.addExecution("scenario-a"));
    act(() => result.current.addExecution("scenario-b"));
    act(() => result.current.addExecution("scenario-c"));
    expect(result.current.selectedExecutionKeys).toEqual(["base", "scenario-a", "scenario-b"]);
    act(() => result.current.removeExecution("base"));
    await waitFor(() => expect(result.current.selectedExecutionKeys).toEqual(["scenario-a", "scenario-b"]));
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

  it("uses full-width final-ranking tracks and bounded compact tracks", () => {
    expect(rankingScoreTrackSx(false)).toMatchObject({ width: "100%", maxWidth: "none" });
    expect(rankingScoreTrackSx(true)).toMatchObject({ width: "100%", maxWidth: 170 });
  });

  it("uses a stretched, balanced comparison grid and a flexible score-panel chart body", () => {
    expect(singleOutcomeGridSx.alignItems).toBe("stretch");
    expect(scoreOverviewPanelSx).toMatchObject({ display: "flex", flexDirection: "column", minWidth: 0, maxWidth: "100%" });
    expect(scoreChartViewportSx).toMatchObject({ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "auto", overflowY: "hidden" });
    expect(scoreChartViewportSx.flex).toBeUndefined();
    expect(scoreChartContainerSx(900, 380)).toMatchObject({ minWidth: 900, width: "100%", flex: "0 0 auto", height: 380, minHeight: 380, maxHeight: 380 });
    expect(rankingListViewportSx(false).maxHeight).toEqual({ xs: 520, xl: 380 });
    expect(comparisonOutcomeGridSx).toMatchObject({ gridTemplateColumns: { lg: "minmax(0, 1.15fr) minmax(0, 0.85fr)" }, alignItems: "stretch" });
    expect(comparisonOutcomeGridSx["& > :first-of-type"].gridColumn.lg).toBe("1 / -1");
    expect(comparisonDetailPanelSx).toMatchObject({ height: "100%", display: "flex", flexDirection: "column" });
    expect(movementChartViewportSx).toMatchObject({ width: "100%", minWidth: 0, overflow: "auto" });
    expect(correlationMatrixViewportSx).toMatchObject({ minWidth: 0, overflowX: "auto", overflowY: "hidden" });
    expect(correlationMatrixViewportSx.flex).toBeUndefined();
    expect(correlationMatrixSx(3)).toMatchObject({ minWidth: 480, width: "100%", gridTemplateColumns: "150px repeat(3, minmax(110px, 1fr))" });
  });

  it("measures ranking-movement width independently from its compact bounded height", () => {
    const movement = (count) => ({
      available: true,
      maxPosition: count,
      executions: [{ key: "base", label: "Base" }, { key: "scenario", label: "Scenario" }, { key: "third", label: "Third" }],
      alternatives: Array.from({ length: count }, (_, index) => ({ id: `a-${index}`, name: `Alternative ${index + 1}`, positions: [{ position: index + 1 }, { position: index + 1 }, { position: index + 1 }] })),
    });
    const originalResizeObserver = window.ResizeObserver;
    const resizeCallbacks = [];
    window.ResizeObserver = class ResizeObserver {
      constructor(callback) { resizeCallbacks.push(callback); }
      observe() {}
      disconnect() {}
    };
    const { rerender } = render(<ThemeProvider theme={createTheme()}><RankingMovementChart movement={movement(3)} /></ThemeProvider>);
    act(() => resizeCallbacks[0]([{ contentRect: { width: 720 } }]));
    const chart = screen.getByRole("img", { name: "Ranking movement chart" });
    expect(chart).toHaveAttribute("width", "720");
    expect(chart).toHaveAttribute("height", "250");
    expect(chart.getAttribute("viewBox")).toBe("0 0 720 250");
    expect(chart).not.toHaveAttribute("preserveAspectRatio", "none");
    expect(chart.style.height).toBe("");
    expect(chart.querySelector("circle")).toHaveAttribute("r", "12");
    expect(chart.querySelector("text")).toHaveAttribute("font-size", "12");
    act(() => resizeCallbacks[0]([{ contentRect: { width: 1040 } }]));
    expect(screen.getByRole("img", { name: "Ranking movement chart" })).toHaveAttribute("height", "250");
    expect(screen.getByRole("img", { name: "Ranking movement chart" })).toHaveAttribute("width", "1040");
    rerender(<ThemeProvider theme={createTheme()}><RankingMovementChart movement={movement(8)} /></ThemeProvider>);
    expect(Number(screen.getByRole("img", { name: "Ranking movement chart" }).getAttribute("height"))).toBeGreaterThan(250);
    window.ResizeObserver = originalResizeObserver;
  });

  it("uses light outlined correlation cells while retaining semantic border colors", () => {
    expect(correlationCellSx(1)).toMatchObject({ borderColor: "rgba(111,220,104,0.72)", bgcolor: "rgba(111,220,104,0.055)" });
    expect(correlationCellSx(0.5)).toMatchObject({ borderColor: "rgba(39,213,228,0.62)", bgcolor: "rgba(39,213,228,0.035)" });
    expect(correlationCellSx(0)).toMatchObject({ borderColor: "rgba(255,255,255,0.24)", bgcolor: "rgba(255,255,255,0.018)" });
    expect(correlationCellSx(-0.5)).toMatchObject({ borderColor: "rgba(169,96,232,0.70)", bgcolor: "rgba(169,96,232,0.05)" });
    expect(correlationCellSx(null)).toMatchObject({ borderColor: "rgba(255,255,255,0.15)", bgcolor: "rgba(255,255,255,0.012)" });
  });

  it("keeps correlation values and their accessible Spearman tooltips in the full-height panel", async () => {
    const correlations = {
      available: true,
      executions: [{ key: "base", label: "Base", color: "#6fdc68" }, { key: "scenario", label: "Scenario", color: "#27d5e4" }],
      cells: [
        { rowKey: "base", columnKey: "base", value: 1, formattedValue: "1.00" },
        { rowKey: "base", columnKey: "scenario", value: -1, formattedValue: "-1.00" },
        { rowKey: "scenario", columnKey: "base", value: -1, formattedValue: "-1.00" },
        { rowKey: "scenario", columnKey: "scenario", value: 1, formattedValue: "1.00" },
      ],
    };
    render(<ThemeProvider theme={createTheme()}><RankingCorrelationMatrix correlations={correlations} /></ThemeProvider>);
    expect(screen.getAllByText("1.00")).toHaveLength(2);
    fireEvent.mouseOver(screen.getAllByText("-1.00")[0]);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Spearman correlation: -1.00");
  });

  it("uses stable bounded responsive numeric chart heights without creating a ResizeObserver", () => {
    expect(getScoreOverviewChartHeight({ isMobile: true, isDesktop: false })).toBe(260);
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

  it("lets small score-overview rankings fit their panel while wide rankings retain horizontal scroll space", () => {
    const smallRanking = Array.from({ length: 3 }, (_, index) => ({ id: `small-${index}`, name: `Alternative ${index + 1}`, score: index, formattedScore: String(index), position: index + 1 }));
    render(<ThemeProvider theme={createTheme()}><ScoreOverviewChart ranking={smallRanking} /></ThemeProvider>);
    expect(scoreChartContainerSx(270, 260)).toMatchObject({ minWidth: 270, width: "100%", maxWidth: "none" });
    expect(screen.getByTestId("score-overview-chart")).toBeInTheDocument();
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

  it("resolves a Base classification through the Base effective profiles and renders its label after the score", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.models.base.effectiveParameters = {
      profiles: [
        { id: "high", label: "Highly suitable", description: "Ignored" },
        { id: "medium", label: "Suitable" },
      ],
    };
    payload.phaseResults[2].standardizedOutput.rankedAlternatives[0].classification = "high";

    const data = buildResultsAnalysisWorkspaceData({
      payload,
      selectedExecutionKeys: ["base"],
    });
    const entry = data.single.ranking[0];

    expect(entry).toMatchObject({
      classificationId: "high",
      classificationLabel: "Highly suitable",
      formattedScore: "0.8",
    });
    render(<ThemeProvider theme={createTheme()}><RankingList ranking={data.single.ranking} /></ThemeProvider>);
    const score = screen.getByText("0.8");
    const chip = screen.getByText("Highly suitable");
    expect(score.compareDocumentPosition(chip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("does not render a classification chip when classification is absent or unresolved", () => {
    const { rerender } = render(<ThemeProvider theme={createTheme()}><RankingList ranking={[{
      id: "a",
      name: "Alpha",
      position: 1,
      score: 0.8,
      formattedScore: "0.8",
      classificationId: null,
      classificationLabel: null,
    }]} /></ThemeProvider>);
    expect(screen.queryByText("Highly suitable")).not.toBeInTheDocument();

    const payload = buildFinishedIssuePayloadFixture();
    payload.phaseResults[2].standardizedOutput.rankedAlternatives[0].classification = "internal-profile-id";
    const data = buildResultsAnalysisWorkspaceData({ payload, selectedExecutionKeys: ["base"] });
    expect(data.single.ranking[0]).toMatchObject({
      classificationId: "internal-profile-id",
      classificationLabel: null,
    });
    rerender(<ThemeProvider theme={createTheme()}><RankingList ranking={data.single.ranking} /></ThemeProvider>);
    expect(screen.queryByText("internal-profile-id")).not.toBeInTheDocument();
  });

  it("resolves classifications independently for Base and scenario parameter snapshots", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.models.base.effectiveParameters = {
      profiles: [{ id: "high", label: "Base high" }],
    };
    payload.phaseResults[2].standardizedOutput.rankedAlternatives[0].classification = "high";
    const scenario = completeScenario("scenario-profiles", [["a", 1, 0.9], ["b", 2, 0.1]]);
    scenario.phaseResults[0].requestSnapshot = {
      modelParameters: {
        profiles: [{ id: "high", label: "Scenario high" }],
      },
    };
    scenario.phaseResults[0].standardizedOutput.rankedAlternatives[0].classification = "high";
    payload.scenarios = [scenario];

    const data = buildResultsAnalysisWorkspaceData({
      payload,
      selectedExecutionKeys: ["base", "scenario-profiles"],
    });

    expect(data.mode).toBe("comparison");
    expect(data.selected[0].ranking[0].classificationLabel).toBe("Base high");
    expect(data.selected[1].ranking[0].classificationLabel).toBe("Scenario high");
  });

  it("does not render alternative descriptions in the Final ranking panel", () => {
    render(<ThemeProvider theme={createTheme()}><FinalRankingPanel ranking={[{ id: "a", name: "Alpha", description: "An alternative description", position: 1, score: 1, formattedScore: "1" }]} /></ThemeProvider>);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("An alternative description")).not.toBeInTheDocument();
  });
});
