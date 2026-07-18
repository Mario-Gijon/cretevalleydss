import { ThemeProvider, createTheme } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "../../../../../src/features/finishedIssueDialog/sections/dashboard/components/charts/ResultsRankingBarChart",
  () => ({
    default: ({ ranking }) => (
      <div data-testid="results-ranking-chart">
        {ranking.map((item) => item.name).join(",")}
      </div>
    ),
  })
);

import DashboardView from "../../../../../src/features/finishedIssueDialog/sections/dashboard/components/DashboardView";
import { dashboardFirstRowSx, dashboardItemSx, dashboardSecondRowSx } from "../../../../../src/features/finishedIssueDialog/sections/dashboard/dashboard.styles";
import { buildModelsData, buildModelsPreview } from "../../../../../src/features/finishedIssueDialog/sections/models/logic/buildModelsData";
import { buildFinishedIssuePayloadFixture } from "../../../../mocks/fixtures/finishedIssueDialog.fixtures";

const renderView = (props) => render(<ThemeProvider theme={createTheme()}><DashboardView {...props} /></ThemeProvider>);

describe("DashboardView", () => {
  it("renders from props and sends view-more actions without a provider", () => {
    const openOverview = vi.fn();
    const openModels = vi.fn();
    const openResultsAnalysis = vi.fn();
    const openEvaluations = vi.fn();
    renderView({
      data: {
        kpis: { winner: { name: "Alternative", formattedScore: "0.8" }, consensus: { enabled: false, label: "Disabled" }, phase: { label: "Final" } },
        overview: { name: "Finished issue", description: "Description", owner: "Test owner", baseModelName: "Model", creationDate: "2026-01-01", closureDate: null, consensusEnabled: false, lifecycleStage: "Completed", acceptedParticipantsCount: 1, alternatives: [{ id: "a", name: "Alternative" }], leafCriteria: [{ id: "c", name: "Cost" }] },
        models: { baseModelName: "Model", selectedExecutionLabel: "Base", selectedModelName: "Model", runsGenerated: 0 },
        resultsAnalysis: {
          context: { executionLabel: "Base", phaseLabel: "Final" },
          outcome: { available: true, winner: { id: "a", name: "Alternative" }, topRanking: [{ id: "a", name: "Alternative", position: 1, score: 0.8, formattedScore: "0.8" }] },
          alternativesCount: 1,
          rankingTitle: "Ranking",
          performanceTitle: "Performance overview",
          visualizations: { hasPerformanceMap: false, performanceMapData: null, selectedPhaseIndex: 0 },
          interpretation: { available: false },
        },
        evaluations: { evaluationsCount: 1, stageLabel: "Alternative evaluation", phaseLabel: "Final", hasCollective: false, showCollective: false, renderer: null },
      },
      actions: {
        openOverview, openModels, openResultsAnalysis, openEvaluations,
      },
    });

    expect(screen.getByText("Interpretation is not available yet.")).toBeInTheDocument();
    expect(screen.getByTestId("results-ranking-chart")).toBeInTheDocument();
    expect(screen.getByText("Alternatives")).toBeInTheDocument();
    expect(screen.getByText("Leaf criteria")).toBeInTheDocument();
    expect(screen.getByText("Cost")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("Test owner")).toBeInTheDocument();
    expect(screen.getByText("Finished")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Consensus")).toBeInTheDocument();
    expect(screen.getByText("Ranking")).toBeInTheDocument();
    expect(screen.getByText("Performance overview")).toBeInTheDocument();
    expect(screen.getByText("Runs generated")).toBeInTheDocument();
    expect(screen.getByText("1 evaluation")).toBeInTheDocument();
    expect(screen.getAllByTestId("summary-card-icon")).toHaveLength(4);
    expect(screen.getAllByTestId("overview-metadata-icon")).toHaveLength(7);
    expect(screen.queryByText("Best option")).not.toBeInTheDocument();
    expect(screen.queryByText("Top score")).not.toBeInTheDocument();
    expect(screen.queryByText("Evaluation coverage")).not.toBeInTheDocument();
    expect(screen.queryByText("Finished issue summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Selected execution configuration")).not.toBeInTheDocument();
    expect(screen.queryByText("Alternative evaluation")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View overview" }));
    fireEvent.click(screen.getByRole("button", { name: "View models" }));
    fireEvent.click(screen.getByRole("button", { name: "View results analysis" }));
    fireEvent.click(screen.getByRole("button", { name: "View evaluations" }));
    expect(openOverview).toHaveBeenCalledOnce();
    expect(openModels).toHaveBeenCalledOnce();
    expect(openResultsAnalysis).toHaveBeenCalledOnce();
    expect(openEvaluations).toHaveBeenCalledOnce();
  });

  it("labels a truncated ranking preview as Top 3 ranking", () => {
    renderView({
      data: {
        kpis: { winner: null, consensus: { enabled: false, label: "Disabled" } },
        overview: { alternatives: [], leafCriteria: [] },
        models: {},
        resultsAnalysis: {
          context: {},
          alternativesCount: 4,
          rankingTitle: "Top 3 ranking",
          performanceTitle: "Top 3 performance overview",
          outcome: { available: true, winner: null, topRanking: [] },
        },
        evaluations: { evaluationsCount: 0, renderer: null },
      },
      actions: { openOverview: vi.fn(), openModels: vi.fn(), openResultsAnalysis: vi.fn(), openEvaluations: vi.fn(), openConsensus: vi.fn() },
    });

    expect(screen.getByText("Top 3 ranking")).toBeInTheDocument();
    expect(screen.getByText("Top 3 performance overview")).toBeInTheDocument();
  });

  it("formats the compact Evaluations header count with the correct plural", () => {
    renderView({
      data: {
        kpis: { winner: null, consensus: { enabled: true, label: "Enabled" }, phase: { label: "Phase 5" } },
        overview: { name: "Finished issue", description: "Description", owner: "Owner", baseModelName: "Model", creationDate: null, closureDate: null, consensusEnabled: true, lifecycleStage: "Finished", acceptedParticipantsCount: 1, alternatives: [], leafCriteria: [] },
        models: { baseModelName: "Model", selectedExecutionLabel: "Base", selectedModelName: "Model", runsGenerated: 0 },
        resultsAnalysis: { context: { executionLabel: "Base", phaseLabel: "Phase 5" }, outcome: { available: false, winner: null, topRanking: [], unavailableReason: "No result" }, interpretation: { available: false } },
        evaluations: { evaluationsCount: 2, stageLabel: "Alternative evaluation", phaseLabel: "Phase 5", hasCollective: false, showCollective: false, renderer: null },
      },
      actions: { openOverview: vi.fn(), openModels: vi.fn(), openResultsAnalysis: vi.fn(), openEvaluations: vi.fn() },
    });

    expect(screen.getByTestId("evaluations-count")).toHaveTextContent("2 evaluations");
    expect(screen.queryByText("1/1 completed")).not.toBeInTheDocument();
  });

  it("renders the complete canonical Finished Issue fixture without object-child errors", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.models.base.description = { short: "Canonical short model description", extended: "Canonical extended description" };
    const models = buildModelsPreview(buildModelsData({ payload, selectedExecution: { type: "base", key: "base", label: "Base", model: payload.models.base } }));
    const data = {
      kpis: { winner: { name: "Alpha", formattedScore: "0.7" }, consensus: { enabled: true, label: "Enabled" }, phase: { label: "Phase 5" } },
      overview: { name: payload.issue.name, description: payload.issue.description, owner: payload.issue.owner.name, baseModelName: payload.models.base.name, creationDate: payload.lifecycle.creationDate, closureDate: payload.lifecycle.closureDate, consensusEnabled: true, lifecycleStage: "Finished", acceptedParticipantsCount: 1, alternatives: [], leafCriteria: [] },
      resultsAnalysis: { context: { executionLabel: "Base", phaseLabel: "Phase 5" }, outcome: { available: true, winner: { name: "Alpha", formattedScore: "0.7" }, topRanking: [{ id: "a", name: "Alpha", position: 1, score: 0.7, formattedScore: "0.7" }] }, interpretation: { available: false } },
      evaluations: { evaluationsCount: 1, stageLabel: "Alternative evaluation", phaseLabel: "Phase 5", hasCollective: true, showCollective: false, renderer: null },
      models,
    };

    renderView({ data, actions: { openOverview: vi.fn(), openModels: vi.fn(), openResultsAnalysis: vi.fn(), openEvaluations: vi.fn() } });

    expect(screen.getByText("Canonical short model description")).toBeInTheDocument();
    expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();
  });

  it("uses natural card rows: Overview is wider than Models and the lower cards share equal columns", () => {
    expect(dashboardFirstRowSx.gridTemplateColumns.lg).toBe("minmax(0, 1.55fr) minmax(340px, 0.9fr)");
    expect(dashboardSecondRowSx.gridTemplateColumns.lg).toBe("repeat(2, minmax(0, 1fr))");
    expect(dashboardFirstRowSx.alignItems).toBe("stretch");
    expect(dashboardSecondRowSx.alignItems).toBe("stretch");
    expect(dashboardItemSx.display).toBe("flex");
    expect(dashboardItemSx["& > *"]).toMatchObject({ width: "100%", height: "100%" });
  });
});
