import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import EmptyState from "../../src/components/StyledComponents/EmptyState.jsx";
import { renderWithProviders } from "../setup/renderWithProviders.jsx";

describe("EmptyState", () => {
  it("renders contextual content and invokes its optional accessible action", async () => {
    const onCreate = vi.fn();
    renderWithProviders(
      <EmptyState
        icon={<AddCircleOutlineIcon />}
        title="No issues yet"
        description="Create an issue to begin."
        action={<button aria-label="Create issue" onClick={onCreate}>Create issue</button>}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent("No issues yet");
    expect(screen.getByText("Create an issue to begin.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Create issue" }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
