import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ManualCriteriaWeightsView from "../../../src/features/decisionPlugins/evaluations/structures/manualCriteriaWeights/ManualCriteriaWeightsView.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const context = {
  leafCriteria: [
    { id: "cost", name: "Cost" },
    { id: "quality", name: "Quality" },
  ],
};

const renderView = ({ payload = {}, collectiveEvaluation = null, readOnly = true } = {}) =>
  renderWithProviders(
    <ManualCriteriaWeightsView
      decisionContext={context}
      evaluation={payload}
      collectiveEvaluation={collectiveEvaluation}
      setEvaluation={vi.fn()}
      readOnly={readOnly}
      loading={false}
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
});
