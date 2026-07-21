import { ThemeProvider, createTheme } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import FinishedIssueNavigation from "../../../../src/features/finishedIssueDialog/shell/FinishedIssueNavigation.jsx";

describe("FinishedIssueNavigation", () => {
  it("presents the Dashboard tab to users as Summary", () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <FinishedIssueNavigation navigation={{ activeTab: "dashboard", availableTabs: ["dashboard", "overview"], selectTab: vi.fn() }} />
      </ThemeProvider>
    );

    expect(screen.getByRole("tab", { name: "Summary" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  it("does not render a redundant Consensus navigation tab", () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <FinishedIssueNavigation navigation={{ activeTab: "results-analysis", availableTabs: ["dashboard", "overview", "results-analysis", "evaluations", "models"], selectTab: vi.fn() }} />
      </ThemeProvider>
    );

    expect(screen.queryByRole("tab", { name: "Consensus" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Summary", "Overview", "Results analysis", "Evaluations", "Models"]);
  });
});
