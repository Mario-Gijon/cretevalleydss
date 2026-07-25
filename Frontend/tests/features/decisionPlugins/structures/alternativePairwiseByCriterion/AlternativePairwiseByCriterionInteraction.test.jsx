import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "../../../../../src/features/expressionDomains/ExpressionDomainEvaluationInput.jsx",
  () => ({
    default: ({ value, onChange, disabled = false }) => (
      <input
        aria-label="expression-domain-input"
        value={typeof value === "number" ? String(value) : value}
        disabled={disabled}
        onChange={(event) => {
          const rawValue = event.target.value;
          onChange(rawValue === "" ? "" : Number(rawValue));
        }}
      />
    ),
  })
);

import AlternativePairwiseByCriterionView from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/AlternativePairwiseByCriterionView.jsx";
import { renderWithProviders } from "../../../../setup/renderWithProviders.jsx";

const decisionContext = {
  alternatives: [
    { id: "alt-a", name: "Alternative A" },
    { id: "alt-b", name: "Alternative B" },
  ],
  leafCriteria: [
    {
      id: "cost",
      name: "Cost",
      expressionDomain: {
        typeKey: "numericContinuous",
        definition: { min: 1, max: 5 },
      },
    },
  ],
};
const emptyEvaluation = {
  cost: {
    "alt-a": { "alt-b": "" },
    "alt-b": { "alt-a": "" },
  },
};

describe("AlternativePairwiseByCriterionView interaction", () => {
  it("updates the complete direct payload in both directions", () => {
    const setEvaluation = vi.fn();

    renderWithProviders(
      <AlternativePairwiseByCriterionView
        decisionContext={decisionContext}
        evaluation={emptyEvaluation}
        setEvaluation={setEvaluation}
        collectiveEvaluation={null}
        readOnly={false}
        loading={false}
      />
    );

    fireEvent.change(screen.getByLabelText("expression-domain-input"), {
      target: { value: "2" },
    });

    expect(setEvaluation).toHaveBeenCalledWith({
      cost: {
        "alt-a": { "alt-b": 2 },
        "alt-b": { "alt-a": 4 },
      },
    });
  });

  it("uses the same public props for a Finished Issue read-only rendering", () => {
    renderWithProviders(
      <AlternativePairwiseByCriterionView
        decisionContext={decisionContext}
        evaluation={{
          cost: {
            "alt-a": { "alt-b": 2 },
            "alt-b": { "alt-a": 4 },
          },
        }}
        setEvaluation={vi.fn()}
        collectiveEvaluation={{
          cost: {
            "alt-a": { "alt-b": 2.5 },
            "alt-b": { "alt-a": 3.5 },
          },
        }}
        readOnly
        loading={false}
      />
    );

    expect(screen.getByLabelText("expression-domain-input")).toBeDisabled();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2.5")).toBeInTheDocument();
  });
});
