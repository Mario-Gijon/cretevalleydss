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
    expect(screen.getAllByRole("combobox")).toHaveLength(3);
    expect(screen.getAllByLabelText("Fixed self-comparison: 1")).toHaveLength(3);
    expect(screen.getByRole("combobox", { name: "Compare Quality with Cost" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Compare Quality with Delivery" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Compare Cost with Delivery" })).toBeInTheDocument();
  });

  it("offers Saaty scale choices and saves only the selected independent comparison", () => {
    const setEvaluation = vi.fn();
    renderView({ evaluation: { comparisons: [] }, setEvaluation });

    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Compare Quality with Cost" }));
    const option = screen.getByRole("option", { name: "3 · row moderately more important" });
    fireEvent.click(option);

    expect(setEvaluation).toHaveBeenCalledWith({
      comparisons: [
        { criterionId: "quality", comparedCriterionId: "cost", value: 3 },
      ],
    });
  });

  it("offers both orientations and the full Saaty range", () => {
    renderView({ evaluation: { comparisons: [] } });
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Compare Quality with Cost" }));
    expect(screen.getByRole("option", { name: "1/9 · column extremely more important" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "1 · equal importance" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "9 · row extremely more important" })).toBeInTheDocument();
  });

  it("shows the reciprocal as read-only and disables editing in read-only mode", () => {
    const { container } = renderView({ readOnly: true });
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Comparison 3")).toBeInTheDocument();
    expect(screen.getByLabelText("Reciprocal comparison 1/3")).toBeInTheDocument();
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
