import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "../../../../../src/features/expressionDomains/ExpressionDomainEvaluationInput.jsx",
  () => ({
    default: ({ value, disabled = false }) => (
      <input
        aria-label="expression-domain-input"
        value={typeof value === "number" ? String(value) : ""}
        disabled={disabled}
        readOnly
      />
    ),
  })
);

import AlternativePairwiseByCriterionView from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/AlternativePairwiseByCriterionView.jsx";
import { renderWithProviders } from "../../../../setup/renderWithProviders.jsx";

const alternatives = [
  { id: "alt-a", name: "Alternative A" },
  { id: "alt-b", name: "Alternative B" },
];
const expressionDomain = {
  typeKey: "numericContinuous",
  definition: { min: 1, max: 5 },
};
const criterion = {
  id: "cost",
  name: "Cost",
  expressionDomain,
};
const decisionContext = {
  alternatives,
  leafCriteria: [criterion],
};
const evaluation = {
  cost: {
    "alt-a": { "alt-b": 2 },
    "alt-b": { "alt-a": 4 },
  },
};

const renderView = (props = {}) =>
  renderWithProviders(
    <AlternativePairwiseByCriterionView
      decisionContext={decisionContext}
      evaluation={evaluation}
      setEvaluation={vi.fn()}
      collectiveEvaluation={null}
      readOnly={false}
      loading={false}
      {...props}
    />
  );

describe("AlternativePairwiseByCriterionView", () => {
  it("renders neutral diagonals and inputs for both pairwise directions", () => {
    renderView();

    expect(screen.getAllByText("Neutral")).toHaveLength(2);
    expect(screen.getAllByLabelText("expression-domain-input")).toHaveLength(2);
    expect(screen.getAllByLabelText("expression-domain-input")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "2" }),
        expect.objectContaining({ value: "4" }),
      ])
    );
  });

  it("renders no payload while loading and reports a missing payload afterward", () => {
    const { container, unmount } = renderView({
      evaluation: null,
      loading: true,
    });

    expect(container).toBeEmptyDOMElement();
    unmount();

    renderView({
      evaluation: null,
      loading: false,
    });

    expect(
      screen.getByText("Pairwise evaluation payload must be an object.")
    ).toBeInTheDocument();
  });

  it("disables every non-diagonal input in read-only mode", () => {
    renderView({ readOnly: true });

    for (const input of screen.getAllByLabelText("expression-domain-input")) {
      expect(input).toBeDisabled();
    }
  });

  it("renders a valid collective payload and reports an invalid one", () => {
    const { unmount } = renderView({
      collectiveEvaluation: {
        cost: {
          "alt-a": { "alt-b": 2.5 },
          "alt-b": { "alt-a": 3.5 },
        },
      },
    });

    expect(screen.getByText("2.5")).toBeInTheDocument();
    expect(screen.getByText("3.5")).toBeInTheDocument();
    unmount();

    renderView({
      collectiveEvaluation: {
        cost: {
          "alt-a": { "alt-b": 2.5 },
        },
      },
    });

    expect(
      screen.getByText(
        "Collective pairwise payload is missing an alternative row."
      )
    ).toBeInTheDocument();
  });

  it("switches the selected criterion", async () => {
    renderView({
      decisionContext: {
        alternatives,
        leafCriteria: [
          criterion,
          {
            ...criterion,
            id: "quality",
            name: "Quality",
          },
        ],
      },
      evaluation: {
        ...evaluation,
        quality: {
          "alt-a": { "alt-b": 3 },
          "alt-b": { "alt-a": 3 },
        },
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Quality" }));

    expect(screen.getAllByLabelText("expression-domain-input")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "3" }),
        expect.objectContaining({ value: "3" }),
      ])
    );
  });
});
