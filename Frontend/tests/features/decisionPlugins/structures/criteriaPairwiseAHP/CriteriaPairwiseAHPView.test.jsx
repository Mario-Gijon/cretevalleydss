import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CriteriaPairwiseAHPView from "../../../../../src/features/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/CriteriaPairwiseAHPView.jsx";
import { renderWithProviders } from "../../../../setup/renderWithProviders.jsx";

const decisionContext = {
  leafCriteria: [
    { id: "quality", name: "Quality" },
    { id: "cost", name: "Cost" },
    { id: "delivery", name: "Delivery" },
  ],
};
const evaluation = {
  comparisons: [
    { criterionId: "quality", comparedCriterionId: "cost", value: 3 },
  ],
};

const renderView = (props = {}) =>
  renderWithProviders(
    <CriteriaPairwiseAHPView
      decisionContext={decisionContext}
      evaluation={evaluation}
      setEvaluation={vi.fn()}
      collectiveEvaluation={null}
      readOnly={false}
      {...props}
    />
  );

describe("CriteriaPairwiseAHPView", () => {
  it("renders a C by C grid with a fixed diagonal and only the upper triangle editable", () => {
    renderView({ evaluation: { comparisons: [] } });

    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getByText("0 of 3 comparisons complete")).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(3);
    expect(screen.getByText("0.5 is neutral. Values above 0.5 favour the row criterion.")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Neutral self-comparison")).toHaveLength(3);
    expect(screen.getByRole("textbox", { name: "Compare Quality with Cost" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Compare Quality with Delivery" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Compare Cost with Delivery" })).toBeInTheDocument();
  });

  it("accepts a normalized preference and persists the matching Saaty judgment by IDs", () => {
    const setEvaluation = vi.fn();
    renderView({ evaluation: { comparisons: [] }, setEvaluation });

    const input = screen.getByRole("textbox", { name: "Compare Quality with Cost" });
    expect(input).toHaveAttribute("inputmode", "decimal");
    fireEvent.change(input, { target: { value: "0.7500" } });

    expect(setEvaluation).toHaveBeenCalledWith({
      comparisons: [
        { criterionId: "quality", comparedCriterionId: "cost", value: 3 },
      ],
    });
  });

  it("updates the opposite cell as a normalized reciprocal and keeps the diagonal neutral", () => {
    const setEvaluation = vi.fn();
    const props = {
      decisionContext,
      evaluation: { comparisons: [] },
      setEvaluation,
      collectiveEvaluation: null,
      readOnly: false,
    };
    const { rerender } = renderWithProviders(<CriteriaPairwiseAHPView {...props} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Compare Quality with Cost" }), {
      target: { value: "0.7500" },
    });

    const updatedEvaluation = {
      comparisons: [
        { criterionId: "quality", comparedCriterionId: "cost", value: 3 },
      ],
    };
    expect(setEvaluation).toHaveBeenCalledWith(updatedEvaluation);
    rerender(<CriteriaPairwiseAHPView {...props} evaluation={updatedEvaluation} />);

    expect(screen.getByLabelText("Reciprocal comparison 0.2500")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Neutral self-comparison")).toHaveLength(3);
    expect(screen.getAllByLabelText("Neutral self-comparison")[0]).toHaveTextContent("Neutral");
  });

  it("clears a prior judgment and marks unsupported normalized drafts invalid", () => {
    const setEvaluation = vi.fn();
    renderView({ setEvaluation });

    const input = screen.getByRole("textbox", { name: "Compare Quality with Cost" });
    fireEvent.change(input, { target: { value: "0.7400" } });

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(setEvaluation).toHaveBeenCalledWith({ comparisons: [] });
  });

  it("shows the reciprocal as read-only and disables editing in read-only mode", () => {
    const { container } = renderView({ readOnly: true });
    expect(screen.queryByRole("textbox", { name: /Compare/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Comparison 0.7500")).toBeInTheDocument();
    expect(screen.getByLabelText("Reciprocal comparison 0.2500")).toBeInTheDocument();
    expect(container.querySelectorAll(".derived-cell")).toHaveLength(3);
  });

  it("renders collective weights and each expert's consistency diagnostics", () => {
    renderView({
      collectiveEvaluation: {
        weightsByCriterion: { quality: 0.6, cost: 0.3, delivery: 0.1 },
        expertWeightsByExpert: {
          expert1: { quality: 0.6, cost: 0.3, delivery: 0.1 },
        },
        expertDiagnosticsByExpert: {
          expert1: {
            expertName: "Expert One",
            lambdaMax: 3,
            consistencyIndex: 0,
            consistencyRatio: 0,
            consistencyStatus: "consistent",
            completedComparisons: 3,
            requiredComparisons: 3,
          },
        },
      },
    });
    expect(screen.getByText("Collective criterion weights")).toBeInTheDocument();
    expect(screen.getByText("Individual priorities and consistency")).toBeInTheDocument();
    expect(screen.getByText("Expert One")).toBeInTheDocument();
    expect(screen.getByText("Consistent · CR 0.0000")).toBeInTheDocument();
    expect(screen.getByText("CI 0.0000 · λmax 3.0000 · 3/3 comparisons")).toBeInTheDocument();
    expect(screen.getAllByText("60.00%")).toHaveLength(2);
  });

  it("reports invalid collective weights instead of presenting them", () => {
    renderView({ collectiveEvaluation: { weightsByCriterion: { quality: 1 } } });
    expect(screen.getByText("AHP collective result must contain normalized weights for every criterion.")).toBeInTheDocument();
    expect(screen.queryByText("Collective criterion weights")).not.toBeInTheDocument();
  });
});
