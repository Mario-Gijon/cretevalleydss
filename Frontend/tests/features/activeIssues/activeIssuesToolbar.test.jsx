import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ActiveIssuesToolbar from "../../../src/features/activeIssues/components/ActiveIssuesToolbar.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

describe("ActiveIssuesToolbar", () => {
  it("labels date sorting as expected finalization while preserving the existing sort key", async () => {
    const user = userEvent.setup();
    const setSortBy = vi.fn();
    renderWithProviders(
      <ActiveIssuesToolbar
        isLgUp={false}
        overview={{ total: 1, tasks: 0, owner: 1, readyResolve: 0 }}
        refreshing={false}
        onRefresh={vi.fn()}
        query=""
        setQuery={vi.fn()}
        searchBy="all"
        setSearchBy={vi.fn()}
        sortBy="name"
        setSortBy={setSortBy}
      />
    );

    await user.click(screen.getAllByRole("combobox")[1]);
    await user.click(screen.getByRole("option", { name: "Expected finalization date" }));

    expect(setSortBy).toHaveBeenCalledWith("deadlineDate");
  });
});
