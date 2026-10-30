import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CriteriaPairwiseAHPView from "../../../../../src/features/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/CriteriaPairwiseAHPView.jsx";
import { criteriaPairwiseAHPViewSx } from "../../../../../src/features/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/styles/CriteriaPairwiseAHPView.styles.js";
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

const choosePreference = (rowCriterion, columnCriterion, label) => {
  const select = screen.getByRole("combobox", {
    name: `Compare ${rowCriterion} with ${columnCriterion}`,
  });
  fireEvent.mouseDown(select, { button: 0 });
  fireEvent.click(screen.getByRole("option", { name: label, exact: true }));
  return select;
};

describe("CriteriaPairwiseAHPView", () => {
  it("does not create an outer horizontal scroller around the DataGrid", () => {
    expect(criteriaPairwiseAHPViewSx.matrixViewport).toMatchObject({
      width: "100%",
      minWidth: 0,
    });
    expect(criteriaPairwiseAHPViewSx.matrixViewport).not.toHaveProperty("overflowX");
    expect(criteriaPairwiseAHPViewSx.matrixViewport).not.toHaveProperty("overscrollBehaviorX");
  });

  it("renders a C by C grid with neutral diagonals and editable comparisons in both directions", () => {
    const { container } = renderView({ evaluation: { comparisons: [] } });

    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.queryByText(/comparisons complete/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(6);
    expect(screen.getByText("1 indicates equal importance. Values greater than 1 favour the row criterion; fractions favour the column criterion.")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Neutral self-comparison")).toHaveLength(3);
    expect(screen.getAllByLabelText("Neutral self-comparison")[0]).toHaveTextContent("1 — Neutral");
    expect(screen.getByRole("combobox", { name: "Compare Quality with Cost" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Compare Quality with Delivery" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Compare Cost with Delivery" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Compare Cost with Quality" })).toBeInTheDocument();
    expect(container.querySelectorAll(".pairwise-grid-cell")).toHaveLength(6);
  });

  it("offers exactly the 17 original Saaty ratios as Select labels", () => {
    renderView({ evaluation: { comparisons: [] } });

    const select = screen.getByRole("combobox", { name: "Compare Quality with Cost" });
    fireEvent.mouseDown(select, { button: 0 });

    expect(screen.getAllByRole("option")).toHaveLength(17);
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(
      ["1/9", "1/8", "1/7", "1/6", "1/5", "1/4", "1/3", "1/2", "1 — Neutral", "2", "3", "4", "5", "6", "7", "8", "9"]
    );
  });

  it("converts normalized preferences to a single Saaty judgment stored by criterion IDs", () => {
    const setEvaluation = vi.fn();
    renderView({ evaluation: { comparisons: [] }, setEvaluation });

    choosePreference("Quality", "Cost", "3");

    expect(setEvaluation).toHaveBeenCalledWith({
      comparisons: [
        { criterionId: "quality", comparedCriterionId: "cost", value: 3 },
      ],
    });
  });

  it("displays the opposite Saaty ratio and keeps the diagonal neutral", () => {
    const setEvaluation = vi.fn();
    const props = {
      decisionContext,
      evaluation: { comparisons: [] },
      setEvaluation,
      collectiveEvaluation: null,
      readOnly: false,
    };
    const { rerender } = renderWithProviders(<CriteriaPairwiseAHPView {...props} />);

    choosePreference("Quality", "Cost", "3");

    const updatedEvaluation = {
      comparisons: [
        { criterionId: "quality", comparedCriterionId: "cost", value: 3 },
      ],
    };
    expect(setEvaluation).toHaveBeenCalledWith(updatedEvaluation);
    rerender(<CriteriaPairwiseAHPView {...props} evaluation={updatedEvaluation} />);

    expect(screen.getByRole("combobox", { name: "Compare Cost with Quality" })).toHaveTextContent("1/3");
    expect(screen.getAllByLabelText("Neutral self-comparison")).toHaveLength(3);
    expect(screen.getAllByLabelText("Neutral self-comparison")[0]).toHaveTextContent("1 — Neutral");
  });

  it("persists a reverse-direction edit once and updates the forward direction", () => {
    const setEvaluation = vi.fn();
    const props = {
      decisionContext,
      evaluation,
      setEvaluation,
      collectiveEvaluation: null,
      readOnly: false,
    };
    const { rerender } = renderWithProviders(<CriteriaPairwiseAHPView {...props} />);
    const reverseInput = screen.getByRole("combobox", { name: "Compare Cost with Quality" });
    expect(reverseInput).toHaveTextContent("1/3");

    choosePreference("Cost", "Quality", "2");

    const updatedEvaluation = {
      comparisons: [
        { criterionId: "cost", comparedCriterionId: "quality", value: 2 },
      ],
    };
    expect(setEvaluation).toHaveBeenCalledWith(updatedEvaluation);
    rerender(<CriteriaPairwiseAHPView {...props} evaluation={updatedEvaluation} />);
    expect(screen.getAllByRole("combobox")).toHaveLength(6);
    expect(screen.getByRole("combobox", { name: "Compare Cost with Quality" })).toHaveTextContent("2");
    expect(screen.getByRole("combobox", { name: "Compare Quality with Cost" })).toHaveTextContent("1/2");
    expect(updatedEvaluation.comparisons).toHaveLength(1);
  });

  it("surfaces legacy judgments outside Saaty's scale without changing them", () => {
    const setEvaluation = vi.fn();
    renderView({
      evaluation: {
        comparisons: [
          { criterionId: "quality", comparedCriterionId: "cost", value: 1.5 },
        ],
      },
      setEvaluation,
    });

    expect(screen.getByText("AHP comparison 1 is outside Saaty's scale.")).toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(setEvaluation).not.toHaveBeenCalled();
  });

  it("clears a judgment explicitly with Backspace without adding a clear option", () => {
    const setEvaluation = vi.fn();
    renderView({ setEvaluation });

    const select = screen.getByRole("combobox", { name: "Compare Quality with Cost" });
    fireEvent.keyDown(select, { key: "Backspace" });

    expect(setEvaluation).toHaveBeenCalledWith({ comparisons: [] });
  });

  it("disables all non-diagonal inputs in read-only mode", () => {
    const { container } = renderView({ readOnly: true });
    const inputs = screen.getAllByRole("combobox", { name: /Compare/ });
    expect(inputs).toHaveLength(6);
    expect(inputs.every((input) => input.getAttribute("aria-disabled") === "true")).toBe(true);
    expect(screen.getAllByLabelText("Neutral self-comparison")).toHaveLength(3);
    expect(container.querySelectorAll(".pairwise-grid-cell")).toHaveLength(6);
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
