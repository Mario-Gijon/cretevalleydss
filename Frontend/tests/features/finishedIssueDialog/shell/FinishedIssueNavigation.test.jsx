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
});
