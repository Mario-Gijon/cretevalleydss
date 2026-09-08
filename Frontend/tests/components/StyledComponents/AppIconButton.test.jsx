import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AddIcon from "@mui/icons-material/Add";

import AppIconButton from "../../../src/components/StyledComponents/AppIconButton.jsx";

describe("AppIconButton", () => {
  it("renders an icon, tooltip, accessible label, and handles clicks", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <AppIconButton label="Add item" onClick={onClick}>
        <AddIcon />
      </AppIconButton>
    );

    const button = screen.getByRole("button", { name: "Add item" });
    expect(button).toBeInTheDocument();
    expect(button.querySelector("svg")).toBeInTheDocument();

    await user.hover(button);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Add item");

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("supports an aria-label override and disabled behavior", () => {
    const onClick = vi.fn();

    render(
      <AppIconButton label="Remove item" ariaLabel="Remove selected item" disabled onClick={onClick}>
        <AddIcon />
      </AppIconButton>
    );

    const button = screen.getByRole("button", { name: "Remove selected item" });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
