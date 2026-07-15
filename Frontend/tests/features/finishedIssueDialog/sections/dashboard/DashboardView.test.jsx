import { ThemeProvider, createTheme } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DashboardView from "../../../../../src/features/finishedIssueDialog/sections/dashboard/components/DashboardView";

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
        evaluations: { expertsCount: 1, phaseLabel: "Final", structure: null, hasCollective: false, criteria: [], finalCriteriaWeights: {}, matrix: null },
      },
      actions: {
        openOverview: vi.fn(), openModels: vi.fn(), openResultsAnalysis,
        openEvaluations: vi.fn(), openConsensus: vi.fn(),
      },
    });

    expect(screen.getByText("Results interpretation is not available yet.")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /chart/i })).not.toBeInTheDocument();
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
        evaluations: { expertsCount: 0, completedExpertsCount: 0, phaseLabel: "Phase 5", structure: null, hasCollective: false, criteria: [], finalCriteriaWeights: {}, matrix: null },
      },
      actions: { openOverview: vi.fn(), openModels: vi.fn(), openResultsAnalysis: vi.fn(), openEvaluations: vi.fn(), openConsensus },
    });

    fireEvent.click(screen.getByRole("button", { name: /consensus/i }));
    expect(openConsensus).toHaveBeenCalledOnce();
  });
});
