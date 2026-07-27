import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import BestWorstCriteriaView from "../../../../../src/features/decisionPlugins/evaluations/structures/bestWorstCriteria/BestWorstCriteriaView.jsx";
import { renderWithProviders } from "../../../../setup/renderWithProviders.jsx";

const decisionContext = {
  leafCriteria: [
    { id: "quality", name: "Quality" },
    { id: "cost", name: "Cost" },
    { id: "delivery", name: "Delivery" },
  ],
};
const evaluation = {
  bestCriterionId: "quality",
  worstCriterionId: "cost",
  bestToOthers: { quality: 1, cost: 5, delivery: 3 },
  othersToWorst: { quality: 5, cost: 1, delivery: 3 },
};

const renderView = (props = {}) =>
  renderWithProviders(
    <BestWorstCriteriaView
      decisionContext={decisionContext}
      evaluation={evaluation}
      setEvaluation={vi.fn()}
      collectiveEvaluation={null}
      readOnly={false}
      loading={false}
      {...props}
    />
  );

describe("BestWorstCriteriaView", () => {
  it("requires a supplied canonical evaluation outside loading", () => {
    renderView({ evaluation: null });

    expect(
      screen.getByText("BWM evaluation must be an object.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("renders comparisons only after selections are present", () => {
    renderView();

    expect(screen.getAllByRole("spinbutton")).toHaveLength(4);
    expect(screen.queryByText("Select a criterion to enter its comparisons."))
      .not.toBeInTheDocument();
  });

  it("disables selectors and comparisons in read-only mode", () => {
    renderView({ readOnly: true });

    for (const selector of screen.getAllByRole("combobox")) {
      expect(selector).toHaveAttribute("aria-disabled", "true");
    }
    for (const input of screen.getAllByRole("spinbutton")) {
      expect(input).toBeDisabled();
    }
  });

  it("renders no payload while loading and reports invalid individual state", () => {
    const { container, unmount } = renderView({
      evaluation: null,
      loading: true,
    });
    expect(container).toBeEmptyDOMElement();
    unmount();

    renderView({ evaluation: {} });
    expect(
      screen.getByText("BWM evaluation has an invalid top-level shape.")
    ).toBeInTheDocument();
  });

  it("renders collective criterion weights once and reports invalid collective state", () => {
    const { unmount } = renderView({
      collectiveEvaluation: {
        weightsByCriterion: {
          quality: 0.6,
          cost: 0.25,
          delivery: 0.15,
        },
      },
    });

    const collectiveHeading = screen.getByText("Collective criterion weights");
    const collectiveSection = collectiveHeading.parentElement;

    expect(collectiveHeading).toBeInTheDocument();
    expect(within(collectiveSection).getAllByText("Quality")).toHaveLength(1);
    expect(within(collectiveSection).getAllByText("Cost")).toHaveLength(1);
    expect(within(collectiveSection).getAllByText("Delivery")).toHaveLength(1);
    expect(screen.getByText("0.6")).toBeInTheDocument();
    expect(screen.getByText("0.25")).toBeInTheDocument();
    expect(screen.getByText("0.15")).toBeInTheDocument();
    unmount();

    renderView({
      collectiveEvaluation: {
        weightsByCriterion: {
          quality: 0.6,
          cost: 0.25,
          delivery: 0.2,
        },
      },
    });
    expect(
      screen.getByText("BWM collective criterion weights must sum to 1.")
    ).toBeInTheDocument();
  });

  it("uses the same public props for Finished Issue rendering", () => {
    renderView({
      readOnly: true,
      collectiveEvaluation: {
        weightsByCriterion: {
          quality: 0.6,
          cost: 0.25,
          delivery: 0.15,
        },
      },
    });

    expect(screen.getByText("Collective criterion weights")).toBeInTheDocument();
    expect(screen.getAllByRole("spinbutton")).toHaveLength(4);
  });
});
