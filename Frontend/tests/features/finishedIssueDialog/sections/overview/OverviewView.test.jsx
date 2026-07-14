import { ThemeProvider, createTheme } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import OverviewView from "../../../../../src/features/finishedIssueDialog/sections/overview/components/OverviewView";

const renderView = (props) => render(<ThemeProvider theme={createTheme()}><OverviewView {...props} /></ThemeProvider>);

describe("OverviewView", () => {
  it("renders from props and sends view-more actions without a provider", () => {
    const openResults = vi.fn();
    renderView({
      data: {
        issue: { description: "Description", creationDate: "2026-01-01", closureDate: null, alternativesCount: 1, criteriaCount: 1, participatingExpertsCount: 1 },
        models: { baseModelName: "Model", selectedExecutionLabel: "Base", additionalRunsCount: 0 },
        results: { available: true, phaseLabel: "Final", items: [{ id: "a", name: "Alternative", score: 0.8, formattedScore: "0.8" }] },
        evaluations: { expertsCount: 1, phaseLabel: "Final", structure: null, hasCollective: false },
        graphs: { hasPerformanceMap: false, hasConsensusEvolution: false },
        consensus: null,
      },
      actions: {
        openIssueDetails: vi.fn(), openModels: vi.fn(), openResults, openAnalysis: vi.fn(),
        openEvaluations: vi.fn(), openConsensus: vi.fn(), openGraphs: vi.fn(),
      },
    });

    expect(screen.getByText("Results analysis is not available yet.")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /chart/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View full ranking" }));
    expect(openResults).toHaveBeenCalledOnce();
  });
});
