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
  it("renders a C by C grid with neutral diagonals and editable comparisons in both directions", () => {
    const { container } = renderView({ evaluation: { comparisons: [] } });

    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getByText("0 of 3 comparisons complete")).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
    expect(screen.getByText("0.5 is neutral. Values above 0.5 favour the row criterion.")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Neutral self-comparison")).toHaveLength(3);
    expect(screen.getByRole("textbox", { name: "Compare Quality with Cost" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Compare Quality with Delivery" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Compare Cost with Delivery" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Compare Cost with Quality" })).toBeInTheDocument();
    expect(container.querySelectorAll(".pairwise-grid-cell")).toHaveLength(6);
  });

  it("uses the shared numeric continuous input with a local 0-to-1 presentation domain", () => {
    const setEvaluation = vi.fn();
    renderView({ evaluation: { comparisons: [] }, setEvaluation });

    const input = screen.getByRole("textbox", { name: "Compare Quality with Cost" });
    expect(input).toHaveAttribute("inputmode", "decimal");
    expect(input).toHaveAttribute("min", "0");
    expect(input).toHaveAttribute("max", "1");
    expect(Number(input.getAttribute("step"))).toBeCloseTo(0.0001, 10);

    fireEvent.change(input, { target: { value: "0." } });
    expect(input).toHaveValue("0.");
    expect(setEvaluation).not.toHaveBeenCalled();
  });

  it("converts normalized preferences to a single Saaty judgment stored by criterion IDs", () => {
    const setEvaluation = vi.fn();
    renderView({ evaluation: { comparisons: [] }, setEvaluation });

    const input = screen.getByRole("textbox", { name: "Compare Quality with Cost" });
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

    expect(screen.getByRole("textbox", { name: "Compare Cost with Quality" })).toHaveValue("0.2500");
    expect(screen.getAllByLabelText("Neutral self-comparison")).toHaveLength(3);
    expect(screen.getAllByLabelText("Neutral self-comparison")[0]).toHaveTextContent("Neutral");
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
    const reverseInput = screen.getByRole("textbox", { name: "Compare Cost with Quality" });
    expect(reverseInput).toHaveValue("0.2500");

    fireEvent.change(reverseInput, { target: { value: "0.6667" } });

    const updatedEvaluation = {
      comparisons: [
        { criterionId: "cost", comparedCriterionId: "quality", value: 2 },
      ],
    };
    expect(setEvaluation).toHaveBeenCalledWith(updatedEvaluation);
    rerender(<CriteriaPairwiseAHPView {...props} evaluation={updatedEvaluation} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
    expect(screen.getByRole("textbox", { name: "Compare Cost with Quality" })).toHaveValue("0.6667");
    expect(screen.getByRole("textbox", { name: "Compare Quality with Cost" })).toHaveValue("0.3333");
    expect(updatedEvaluation.comparisons).toHaveLength(1);
  });

  it("keeps the committed judgment while an unsupported normalized value is being edited", () => {
    const setEvaluation = vi.fn();
    renderView({ setEvaluation });

    const input = screen.getByRole("textbox", { name: "Compare Quality with Cost" });
    fireEvent.change(input, { target: { value: "0.7400" } });

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveValue("0.7400");
    expect(screen.getByText("1 of 3 comparisons complete")).toBeInTheDocument();
    expect(setEvaluation).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "0.7500" } });
    expect(input).not.toHaveAttribute("aria-invalid", "true");
    expect(setEvaluation).toHaveBeenCalledWith({
      comparisons: [
        { criterionId: "quality", comparedCriterionId: "cost", value: 3 },
      ],
    });
  });

  it("clears a judgment only when the user empties its input", () => {
    const setEvaluation = vi.fn();
    renderView({ setEvaluation });

    const input = screen.getByRole("textbox", { name: "Compare Quality with Cost" });
    fireEvent.change(input, { target: { value: "" } });

    expect(setEvaluation).toHaveBeenCalledWith({ comparisons: [] });
  });

  it("disables all non-diagonal inputs in read-only mode", () => {
    const { container } = renderView({ readOnly: true });
    const inputs = screen.getAllByRole("textbox", { name: /Compare/ });
    expect(inputs).toHaveLength(6);
    expect(inputs.every((input) => input.disabled)).toBe(true);
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
