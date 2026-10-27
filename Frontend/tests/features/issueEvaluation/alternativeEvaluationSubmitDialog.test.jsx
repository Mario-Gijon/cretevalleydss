import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AlternativeEvaluationSubmitDialog from "../../../src/features/issueEvaluation/components/AlternativeEvaluationSubmitDialog.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

describe("AlternativeEvaluationSubmitDialog optional warning", () => {
  it("shows an optional diagnostic warning while keeping Submit available", () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <AlternativeEvaluationSubmitDialog
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        warningMessage="Comparisons deserve review. You can still submit."
      />,
    );

    expect(screen.getByText("Comparisons deserve review. You can still submit.")).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Submit" });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("keeps the existing generic confirmation when no warning is supplied", () => {
    renderWithProviders(
      <AlternativeEvaluationSubmitDialog open onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByText("Submit evaluations?")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
