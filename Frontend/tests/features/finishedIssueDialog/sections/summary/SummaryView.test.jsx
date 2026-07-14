import { ThemeProvider, createTheme } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SummaryView from "../../../../../src/features/finishedIssueDialog/sections/summary/components/SummaryView";

const renderView = (props) => render(<ThemeProvider theme={createTheme()}><SummaryView {...props} /></ThemeProvider>);

describe("SummaryView", () => {
  it("renders explicit section data and invokes disclosure actions", () => {
    const toggleAlternatives = vi.fn();
    renderView({
      data: {
        general: { name: "Issue", owner: "Owner", model: "Model", creationDate: "2026-01-01", closureDate: null },
        description: "Description",
        criteria: [{ id: "criterion", name: "Criterion", isLeaf: true, weight: 1 }],
        alternatives: [{ id: "alternative", name: "Alternative", description: "Alternative description" }],
        experts: { total: 2, participated: ["Accepted"], notAccepted: ["Not accepted"] },
        consensus: { threshold: 0.8, maxPhases: 3, reachedPhaseLabel: "Phase 2", finalizationReason: "Reached", finalMeasure: 0.9 },
      },
      state: { descriptionExpanded: true, criteriaExpanded: true, alternativesExpanded: true, expertsExpanded: true },
      actions: { toggleDescription: vi.fn(), toggleCriteria: vi.fn(), toggleAlternatives, toggleExperts: vi.fn() },
    });

    expect(screen.getByText("Criterion")).toBeInTheDocument();
    expect(screen.getByText("Alternative description")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /alternatives/i }));
    expect(toggleAlternatives).toHaveBeenCalledOnce();
  });
});
