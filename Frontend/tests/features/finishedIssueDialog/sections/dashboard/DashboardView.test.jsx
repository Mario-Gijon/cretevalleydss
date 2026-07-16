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
import { buildModelsData, buildModelsPreview } from "../../../../../src/features/finishedIssueDialog/sections/models/logic/buildModelsData";
import { buildFinishedIssuePayloadFixture } from "../../../../mocks/fixtures/finishedIssueDialog.fixtures";

const renderView = (props) => render(<ThemeProvider theme={createTheme()}><DashboardView {...props} /></ThemeProvider>);

describe("DashboardView", () => {
  it("renders from props and sends view-more actions without a provider", () => {
    const openResultsAnalysis = vi.fn();
    renderView({
      data: {
        kpis: { winner: { name: "Alternative", formattedScore: "0.8" }, evaluationCoverage: { completed: 1, total: 1, formattedPercentage: "100%" }, consensus: { enabled: false, label: "Disabled" }, phase: { label: "Final" } },
        overview: { name: "Finished issue", description: "Description", owner: "Owner", baseModelName: "Model", creationDate: "2026-01-01", closureDate: null, consensusEnabled: false, lifecycleStage: "Finished", acceptedParticipantsCount: 1 },
        models: { baseModelName: "Model", selectedExecutionLabel: "Base", additionalRunsCount: 0, parameters: {} },
        resultsAnalysis: {
          context: { executionLabel: "Base", phaseLabel: "Final" },
          outcome: { available: true, winner: { id: "a", name: "Alternative" }, topRanking: [{ id: "a", name: "Alternative", position: 1, score: 0.8, formattedScore: "0.8" }] },
          visualizations: { hasPerformanceMap: false, performanceMapData: null, selectedPhaseIndex: 0 },
          interpretation: { available: false },
        },
        evaluations: { expertsCount: 1, completedExpertsCount: 1, stageLabel: "Alternative evaluation", phaseLabel: "Final", hasCollective: false, showCollective: false, renderer: null },
      },
      actions: {
        openOverview: vi.fn(), openModels: vi.fn(), openResultsAnalysis,
        openEvaluations: vi.fn(), openConsensus: vi.fn(),
      },
    });

    expect(screen.getByText("Interpretation is not available yet.")).toBeInTheDocument();
    expect(screen.getByTestId("results-ranking-chart")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View results analysis" }));
    expect(openResultsAnalysis).toHaveBeenCalledOnce();
  });

  it("opens Consensus only from an enabled Consensus KPI", () => {
    const openConsensus = vi.fn();
    renderView({
      data: {
        kpis: { winner: null, evaluationCoverage: null, consensus: { enabled: true, label: "Enabled" }, phase: { label: "Phase 5" } },
        overview: { name: "Finished issue", description: "Description", owner: "Owner", baseModelName: "Model", creationDate: null, closureDate: null, consensusEnabled: true, lifecycleStage: "Finished", acceptedParticipantsCount: 1 },
        models: { baseModelName: "Model", selectedExecutionLabel: "Base", additionalRunsCount: 0, parameters: {} },
        resultsAnalysis: { context: { executionLabel: "Base", phaseLabel: "Phase 5" }, outcome: { available: false, winner: null, topRanking: [], unavailableReason: "No result" }, interpretation: { available: false } },
        evaluations: { expertsCount: 0, completedExpertsCount: 0, stageLabel: "Alternative evaluation", phaseLabel: "Phase 5", hasCollective: false, showCollective: false, renderer: null },
      },
      actions: { openOverview: vi.fn(), openModels: vi.fn(), openResultsAnalysis: vi.fn(), openEvaluations: vi.fn(), openConsensus },
    });

    fireEvent.click(screen.getByRole("button", { name: /consensus/i }));
    expect(openConsensus).toHaveBeenCalledOnce();
  });

  it("renders the complete canonical Finished Issue fixture without object-child errors", () => {
    const payload = buildFinishedIssuePayloadFixture();
    payload.models.base.description = { short: "Canonical short model description", extended: "Canonical extended description" };
    const models = buildModelsPreview(buildModelsData({ payload, selectedExecution: { type: "base", key: "base", label: "Base", model: payload.models.base } }));
    const data = {
      kpis: { winner: { name: "Alpha", formattedScore: "0.7" }, evaluationCoverage: { completed: 1, total: 1, formattedPercentage: "100%" }, consensus: { enabled: true, label: "Enabled" }, phase: { label: "Phase 5" } },
      overview: { name: payload.issue.name, description: payload.issue.description, owner: payload.issue.owner.name, baseModelName: payload.models.base.name, creationDate: payload.lifecycle.creationDate, closureDate: payload.lifecycle.closureDate, consensusEnabled: true, lifecycleStage: "Finished", acceptedParticipantsCount: 1 },
      resultsAnalysis: { context: { executionLabel: "Base", phaseLabel: "Phase 5" }, outcome: { available: true, winner: { name: "Alpha", formattedScore: "0.7" }, topRanking: [{ id: "a", name: "Alpha", position: 1, score: 0.7, formattedScore: "0.7" }] }, interpretation: { available: false } },
      evaluations: { expertsCount: 1, completedExpertsCount: 1, stageLabel: "Alternative evaluation", phaseLabel: "Phase 5", hasCollective: true, showCollective: false, renderer: null },
      models,
    };

    renderView({ data, actions: { openOverview: vi.fn(), openModels: vi.fn(), openResultsAnalysis: vi.fn(), openEvaluations: vi.fn(), openConsensus: vi.fn() } });

    expect(screen.getByText("Canonical short model description")).toBeInTheDocument();
    expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();
  });
});
