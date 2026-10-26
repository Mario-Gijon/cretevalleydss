import { ThemeProvider, createTheme } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import FinishedIssueNavigation, { FinishedIssueTabScrollButton } from "../../../../src/features/finishedIssueDialog/shell/FinishedIssueNavigation.jsx";

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

  it("presents Results analysis as Analysis", () => {
    const { container } = render(
      <ThemeProvider theme={createTheme()}>
        <FinishedIssueNavigation navigation={{ activeTab: "results-analysis", availableTabs: ["dashboard", "overview", "results-analysis", "evaluations", "models"], selectTab: vi.fn() }} />
      </ThemeProvider>
    );

    expect(screen.getByRole("tab", { name: "Analysis" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Results analysis" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Summary", "Issue info", "Analysis", "Evaluations", "Executions"]);
    expect(screen.getByRole("tab", { name: "Executions" }).querySelector("svg")).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Finished issue sections" }).parentElement).toHaveClass("MuiTabs-scroller");
    expect(container.querySelectorAll(".MuiTabScrollButton-root")).toHaveLength(0);
  });

  it("keeps a disabled scroll arrow visible and prevents its click from reaching the tabs", () => {
    const onClick = vi.fn();
    render(
      <ThemeProvider theme={createTheme()}>
        <FinishedIssueTabScrollButton direction="left" disabled onClick={onClick} />
      </ThemeProvider>
    );

    const leftArrow = screen.getByRole("button", { name: "Scroll tabs left" });
    expect(leftArrow).toHaveAttribute("aria-disabled", "true");
    expect(leftArrow).toHaveAttribute("tabindex", "-1");
    expect(leftArrow).toHaveClass("Mui-disabled");
    expect(getComputedStyle(leftArrow).opacity).toBe("0.42");
    expect(getComputedStyle(leftArrow).pointerEvents).toBe("auto");

    fireEvent.click(leftArrow);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("preserves MUI scrolling callbacks for enabled arrows", () => {
    const onClick = vi.fn();
    render(
      <ThemeProvider theme={createTheme()}>
        <FinishedIssueTabScrollButton direction="right" disabled={false} onClick={onClick} />
      </ThemeProvider>
    );

    const rightArrow = screen.getByRole("button", { name: "Scroll tabs right" });
    expect(rightArrow).not.toHaveAttribute("aria-disabled", "true");
    expect(rightArrow).toHaveAttribute("tabindex", "0");
    fireEvent.click(rightArrow);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
