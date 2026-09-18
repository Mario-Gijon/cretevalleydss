import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ActiveIssuesPagination from "../../src/features/activeIssues/components/ActiveIssuesPagination.jsx";
import FinishedIssuesPagination from "../../src/features/finishedIssues/components/FinishedIssuesPagination.jsx";
import { renderWithProviders } from "../setup/renderWithProviders.jsx";

describe("issue pagination", () => {
  it("uses the same filled secondary presentation for both issue lists", () => {
    renderWithProviders(
      <>
        <ActiveIssuesPagination page={1} pageCount={2} onChange={vi.fn()} />
        <FinishedIssuesPagination page={1} pageCount={2} onChange={vi.fn()} />
      </>
    );

    const activeNavigation = screen.getByRole("navigation", {
      name: "Active issues pages",
    });
    const finishedNavigation = screen.getByRole("navigation", {
      name: "Finished issues pages",
    });

    for (const navigation of [activeNavigation, finishedNavigation]) {
      expect(within(navigation).getByRole("button", { name: "page 1" })).toHaveClass(
        "Mui-selected"
      );
      expect(navigation.querySelector(".MuiPaginationItem-outlined")).toBeNull();
    }
  });

  it("keeps page changes wired to each feature callback", () => {
    const onActiveChange = vi.fn();
    const onFinishedChange = vi.fn();

    renderWithProviders(
      <>
        <ActiveIssuesPagination page={1} pageCount={2} onChange={onActiveChange} />
        <FinishedIssuesPagination page={1} pageCount={2} onChange={onFinishedChange} />
      </>
    );

    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Active issues pages" })).getByRole(
        "button",
        { name: "Go to page 2" }
      )
    );
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Finished issues pages" })).getByRole(
        "button",
        { name: "Go to page 2" }
      )
    );

    expect(onActiveChange).toHaveBeenCalledWith(2);
    expect(onFinishedChange).toHaveBeenCalledWith(2);
  });
});
