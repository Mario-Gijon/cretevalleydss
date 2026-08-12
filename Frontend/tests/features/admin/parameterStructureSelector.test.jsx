import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ParameterStructureSelector from "../../../src/features/admin/modelForge/ParameterStructureSelector.jsx";

describe("ParameterStructureSelector", () => {
  const options = [{ key: "selectGlobal" }];

  it("offers only available existing options and switches to the new-key flow", () => {
    const onModeChange = vi.fn();
    const onValueChange = vi.fn();

    const { rerender } = render(
      <ParameterStructureSelector
        mode="existing"
        value=""
        options={options}
        error=""
        onModeChange={onModeChange}
        onValueChange={onValueChange}
      />
    );

    expect(screen.getByLabelText("Structure")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create new" }));
    expect(onModeChange).toHaveBeenCalledWith("new");

    rerender(
      <ParameterStructureSelector
        mode="new"
        value="numberAlternative"
        options={options}
        error="Conflict"
        onModeChange={onModeChange}
        onValueChange={onValueChange}
      />
    );

    expect(screen.getByLabelText("New structure key")).toBeInTheDocument();
    expect(screen.getByText(/will create a new Backend/)).toBeInTheDocument();
    expect(screen.getByText("Conflict")).toBeInTheDocument();
  });
});
