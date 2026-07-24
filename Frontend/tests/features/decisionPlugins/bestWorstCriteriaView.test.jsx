import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import BestWorstCriteriaView from "../../../src/features/decisionPlugins/evaluations/structures/bestWorstCriteria/BestWorstCriteriaView.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const decisionContext = {
  leafCriteria: [
    { id: "cost", name: "Cost" },
    { id: "quality", name: "Quality" },
    { id: "speed", name: "Speed" },
  ],
};

const evaluation = {
  bestCriterion: "cost",
  worstCriterion: "speed",
  bestToOthers: { cost: 1, quality: 3, speed: 4 },
  othersToWorst: { cost: 4, quality: 2, speed: 1 },
};

const renderView = ({
  setEvaluation = vi.fn(),
  readOnly = false,
  loading = false,
} = {}) =>
  renderWithProviders(
    <BestWorstCriteriaView
      decisionContext={decisionContext}
      evaluation={evaluation}
      setEvaluation={setEvaluation}
      collectiveEvaluation={null}
      readOnly={readOnly}
      loading={loading}
    />
  );

describe("BestWorstCriteriaView", () => {
  it("updates a comparison through setEvaluation", () => {
    const setEvaluation = vi.fn();
    renderView({ setEvaluation });

    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "5" } });

    expect(setEvaluation).toHaveBeenLastCalledWith({
      ...evaluation,
      bestToOthers: {
        ...evaluation.bestToOthers,
        quality: 5,
      },
    });
  });

  it.each([
    { readOnly: true, loading: false },
    { readOnly: false, loading: true },
  ])("disables selection and comparisons for $readOnly/$loading", ({
    readOnly,
    loading,
  }) => {
    renderView({ readOnly, loading });

    screen.getAllByRole("combobox").forEach((select) => {
      expect(select).toHaveAttribute("aria-disabled", "true");
    });
    screen.getAllByRole("spinbutton").forEach((input) => {
      expect(input).toBeDisabled();
    });
  });

  it("continues to ignore collective evaluation data", () => {
    renderWithProviders(
      <BestWorstCriteriaView
        decisionContext={decisionContext}
        evaluation={evaluation}
        setEvaluation={vi.fn()}
        collectiveEvaluation={{ unexpected: true }}
        readOnly
        loading={false}
      />
    );

    expect(screen.getByText("Best to others")).toBeInTheDocument();
    expect(screen.queryByText("unexpected")).not.toBeInTheDocument();
  });
});
