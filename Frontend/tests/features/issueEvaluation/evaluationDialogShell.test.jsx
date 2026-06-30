import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AlternativeEvaluationDialogShell from "../../../src/features/issueEvaluation/components/AlternativeEvaluationDialogShell.jsx";
import AlternativeEvaluationSaveDialog from "../../../src/features/issueEvaluation/components/AlternativeEvaluationSaveDialog.jsx";
import AlternativeEvaluationSubmitDialog from "../../../src/features/issueEvaluation/components/AlternativeEvaluationSubmitDialog.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

describe("evaluation dialog shell and confirmation dialogs", () => {
  it("renders shell children and actions and toggles collective visibility", async () => {
    const onToggleCollective = vi.fn();

    renderWithProviders(
      <AlternativeEvaluationDialogShell
        open
        onClose={vi.fn()}
        title="Alternative evaluation"
        subtitle="Budget Planning"
        showCollectiveControl
        collectiveVisible={false}
        onToggleCollective={onToggleCollective}
        actions={<button>Action button</button>}
      >
        <div>Dialog content</div>
      </AlternativeEvaluationDialogShell>
    );

    expect(screen.getByText("Alternative evaluation")).toBeInTheDocument();
    expect(screen.getByText("Budget Planning")).toBeInTheDocument();
    expect(screen.getByText("Dialog content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Action button" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Show collective" }));

    expect(onToggleCollective).toHaveBeenCalledTimes(1);
  });

  it("save dialog triggers save and exit actions", async () => {
    const onSave = vi.fn();
    const onExit = vi.fn();

    renderWithProviders(
      <AlternativeEvaluationSaveDialog
        open
        onClose={vi.fn()}
        onSave={onSave}
        onExit={onExit}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await userEvent.click(screen.getByRole("button", { name: "Exit" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("submit dialog confirms submit and allows cancel", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    renderWithProviders(
      <AlternativeEvaluationSubmitDialog
        open
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
