import CheckIcon from "@mui/icons-material/Check";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConfirmationDialog } from "../../src/components/StyledComponents/ConfirmationDialog.jsx";
import { renderWithProviders } from "../setup/renderWithProviders.jsx";

describe("ConfirmationDialog", () => {
  it("maps info and secondary to the shared secondary tone and renders a header icon", () => {
    const { rerender } = renderWithProviders(
      <ConfirmationDialog open onClose={vi.fn()} tone="info" title="Information" />
    );

    expect(screen.getByRole("dialog")).toHaveAttribute(
      "data-confirmation-tone",
      "secondary"
    );
    expect(screen.getByTestId("confirmation-dialog-header-icon")).toBeInTheDocument();

    rerender(
      <ConfirmationDialog open onClose={vi.fn()} tone="secondary" title="Neutral" />
    );

    expect(screen.getByRole("dialog")).toHaveAttribute(
      "data-confirmation-tone",
      "secondary"
    );
  });

  it("renders accessible icon-only actions and preserves disabled/loading state", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <ConfirmationDialog
        open
        onClose={vi.fn()}
        tone="success"
        title="Continue?"
        actions={[
          {
            id: "confirm",
            label: "Confirm",
            icon: <CheckIcon />,
            iconOnly: true,
            ariaLabel: "Confirm operation",
            tooltip: "Confirm operation",
            onClick: onConfirm,
            autoFocus: true,
          },
          {
            id: "busy",
            label: "Busy",
            icon: <CheckIcon />,
            iconOnly: true,
            ariaLabel: "Busy operation",
            loading: true,
          },
        ]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Confirm operation" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Busy operation" })).toBeDisabled();
  });

  it("keeps destructive actions explicitly labelled", () => {
    renderWithProviders(
      <ConfirmationDialog
        open
        onClose={vi.fn()}
        tone="error"
        title="Delete issue?"
        headerIcon={<DeleteOutlineIcon />}
        actions={[
          {
            id: "delete",
            label: "Delete issue",
            icon: <DeleteOutlineIcon />,
            color: "error",
            onClick: vi.fn(),
          },
        ]}
      />
    );

    expect(screen.getByRole("button", { name: "Delete issue" })).toBeInTheDocument();
  });
});
