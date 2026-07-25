import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ManualCriteriaWeightsView from "../../../../../src/features/decisionPlugins/evaluations/structures/manualCriteriaWeights/ManualCriteriaWeightsView.jsx";
import { renderWithProviders } from "../../../../setup/renderWithProviders.jsx";

const decisionContext = {
  leafCriteria: [
    { id: "cost", name: "Cost" },
    { id: "quality", name: "Quality" },
    { id: "delivery", name: "Delivery" },
  ],
};
const evaluation = {
  weightsByCriterion: { cost: 0.3, quality: 0.5, delivery: 0.2 },
};

const renderView = (props = {}) =>
  renderWithProviders(
    <ManualCriteriaWeightsView
      decisionContext={decisionContext}
      evaluation={evaluation}
      setEvaluation={vi.fn()}
      collectiveEvaluation={null}
      readOnly={false}
      loading={false}
      {...props}
    />
  );

describe("ManualCriteriaWeightsView", () => {
  it("renders an empty canonical payload without inventing equal weights", () => {
    renderView({ evaluation: null });

    expect(screen.getAllByRole("spinbutton").map((input) => input.value)).toEqual(
      ["", "", ""]
    );
    expect(
      screen.getByText(
        "Assign each criterion a weight between 0 and 1. Submitted weights must sum to 1."
      )
    ).toBeInTheDocument();
  });

  it("renders individual values and formatted collective values once per criterion", () => {
    renderView({
      collectiveEvaluation: {
        weightsByCriterion: { cost: 0.3, quality: 0.5, delivery: 0.2 },
      },
    });

    expect(screen.getAllByRole("spinbutton").map((input) => input.value)).toEqual(
      ["0.3", "0.5", "0.2"]
    );
    expect(screen.getAllByText("Collective 0.3")).toHaveLength(1);
    expect(screen.getAllByText("Collective 0.5")).toHaveLength(1);
    expect(screen.getAllByText("Collective 0.2")).toHaveLength(1);
  });

  it("reports malformed individual state", () => {
    renderView({ evaluation: { weightsByCriterion: { cost: 0.3 } } });

    expect(
      screen.getByText("Manual-weight weightsByCriterion must contain exactly all leaf criteria.")
    ).toBeInTheDocument();
  });

  it("reports invalid collective state without hiding individual fields", () => {
    renderView({
      collectiveEvaluation: {
        weightsByCriterion: { cost: 0.3, quality: 0.5, unknown: 0.2 },
      },
    });

    expect(
      screen.getByText("Manual-weight collective weights must contain exactly all leaf criteria.")
    ).toBeInTheDocument();
    expect(screen.getAllByRole("spinbutton")).toHaveLength(3);
  });

  it("supports read-only and loading states", () => {
    const { unmount } = renderView({ readOnly: true });
    for (const input of screen.getAllByRole("spinbutton")) {
      expect(input).toBeDisabled();
    }
    unmount();

    const { container } = renderView({ evaluation: null, loading: true });
    expect(container).toBeEmptyDOMElement();
  });

  it("uses the same public props for Finished Issue rendering", () => {
    renderView({
      readOnly: true,
      collectiveEvaluation: {
        weightsByCriterion: { cost: 0.3, quality: 0.5, delivery: 0.2 },
      },
    });

    const costField = screen.getByText("Cost").parentElement;
    expect(within(costField).getByText("Collective 0.3")).toBeInTheDocument();
  });
});
