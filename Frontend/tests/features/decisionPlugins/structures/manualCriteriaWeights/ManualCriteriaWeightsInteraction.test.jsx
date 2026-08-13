import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ManualCriteriaWeightsView from "../../../../../src/features/decisionPlugins/evaluations/structures/manualCriteriaWeights/ManualCriteriaWeightsView.jsx";
import { renderWithProviders } from "../../../../setup/renderWithProviders.jsx";

const decisionContext = {
  leafCriteria: [
    { id: "cost", name: "Cost" },
    { id: "quality", name: "Quality" },
  ],
};
const evaluation = {
  weightsByCriterion: { cost: 0.4, quality: 0.6 },
};

const renderEditableView = (setEvaluation) =>
  renderWithProviders(
    <ManualCriteriaWeightsView
      decisionContext={decisionContext}
      evaluation={evaluation}
      setEvaluation={setEvaluation}
      collectiveEvaluation={null}
      readOnly={false}
    />
  );

describe("ManualCriteriaWeightsView interaction", () => {
  it("updates valid decimal, zero, one, and cleared values", () => {
    const setEvaluation = vi.fn();
    renderEditableView(setEvaluation);
    const costInput = screen.getAllByRole("spinbutton")[0];

    fireEvent.change(costInput, { target: { value: "0.25" } });
    expect(setEvaluation).toHaveBeenLastCalledWith({
      weightsByCriterion: { cost: 0.25, quality: 0.6 },
    });

    fireEvent.change(costInput, { target: { value: "0" } });
    expect(setEvaluation).toHaveBeenLastCalledWith({
      weightsByCriterion: { cost: 0, quality: 0.6 },
    });

    fireEvent.change(costInput, { target: { value: "1" } });
    expect(setEvaluation).toHaveBeenLastCalledWith({
      weightsByCriterion: { cost: 1, quality: 0.6 },
    });

    fireEvent.change(costInput, { target: { value: "" } });
    expect(setEvaluation).toHaveBeenLastCalledWith({
      weightsByCriterion: { cost: "", quality: 0.6 },
    });
  });

  it("does not publish invalid numeric input", () => {
    const setEvaluation = vi.fn();
    renderEditableView(setEvaluation);
    const costInput = screen.getAllByRole("spinbutton")[0];

    fireEvent.change(costInput, { target: { value: "-0.1" } });
    fireEvent.change(costInput, { target: { value: "1.1" } });

    expect(setEvaluation).not.toHaveBeenCalled();
  });
});
