import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AppDialog } from "../../src/components/StyledComponents/AppDialog.jsx";
import { renderWithProviders } from "../setup/renderWithProviders.jsx";

describe("AppDialog", () => {
  it("renders a contextual header icon and closes through the accessible header action", async () => {
    const onClose = vi.fn();

    renderWithProviders(
      <AppDialog open onClose={onClose} title="Details" icon={<InfoOutlinedIcon />}>
        <div>Dialog content</div>
      </AppDialog>
    );

    expect(screen.getByTestId("app-dialog-header-icon")).toBeInTheDocument();
    expect(screen.getByText("Dialog content")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Close dialog" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
