import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ManualCriteriaWeightsView from "../../../src/features/decisionPlugins/evaluations/structures/manualCriteriaWeights/ManualCriteriaWeightsView.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const context = {
  leafCriteria: [
    { id: "cost", name: "Cost" },
    { id: "quality", name: "Quality" },
  ],
};

const renderView = ({
  payload = {},
  collectiveEvaluation = null,
  readOnly = true,
  loading = false,
  setEvaluation = vi.fn(),
} = {}) =>
  renderWithProviders(
    <ManualCriteriaWeightsView
      decisionContext={context}
      evaluation={payload}
      collectiveEvaluation={collectiveEvaluation}
      setEvaluation={setEvaluation}
      readOnly={readOnly}
      loading={loading}
    />
  );

describe("ManualCriteriaWeightsView", () => {
  it("keeps individual criterion weights visible and adds stored collective weights by criterion id", () => {
    renderView({
      payload: { weightsByCriterion: { cost: 0.4, quality: 0.6 } },
      collectiveEvaluation: { weightsByCriterion: { quality: 0.55, cost: 0.45 } },
    });

    expect(screen.getAllByRole("spinbutton").map((input) => input.value)).toEqual(["0.4", "0.6"]);
    expect(screen.getByText("Collective 0.45")).toBeInTheDocument();
    expect(screen.getByText("Collective 0.55")).toBeInTheDocument();
  });

  it("does not render collective chips when the payload is absent", () => {
    renderView({ payload: { weightsByCriterion: { cost: 0.4, quality: 0.6 } } });

    expect(screen.queryByText(/Collective/)).not.toBeInTheDocument();
  });

  it("renders collective-only weights safely without inventing individual values", () => {
    renderView({
      collectiveEvaluation: { weightsByCriterion: { cost: 0.45, quality: 0.55 } },
    });

    expect(screen.getAllByRole("spinbutton").map((input) => input.value)).toEqual(["", ""]);
    expect(screen.getByText("Collective 0.45")).toBeInTheDocument();
    expect(screen.getByText("Collective 0.55")).toBeInTheDocument();
  });

  it("updates the complete evaluation through setEvaluation", () => {
    const setEvaluation = vi.fn();

    renderView({
      payload: { weightsByCriterion: { cost: 0.4, quality: 0.6 } },
      readOnly: false,
      setEvaluation,
    });

    const costInput = screen.getAllByRole("spinbutton")[0];
    fireEvent.change(costInput, { target: { value: "0.5" } });

    expect(setEvaluation).toHaveBeenLastCalledWith({
      weightsByCriterion: { cost: 0.5, quality: 0.6 },
    });
  });

  it.each([
    { readOnly: true, loading: false },
    { readOnly: false, loading: true },
  ])("disables editing for $readOnly/$loading", ({ readOnly, loading }) => {
    renderView({
      payload: { weightsByCriterion: { cost: 0.4, quality: 0.6 } },
      readOnly,
      loading,
    });

    screen.getAllByRole("spinbutton").forEach((input) => {
      expect(input).toBeDisabled();
    });
  });
});
