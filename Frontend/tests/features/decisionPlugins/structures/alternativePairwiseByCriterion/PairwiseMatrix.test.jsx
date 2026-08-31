import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Cell from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/components/Cell.jsx";
import { renderWithProviders } from "../../../../setup/renderWithProviders.jsx";

const expressionDomain = {
  typeKey: "linguistic2Tuple",
  definition: {
    labels: [
      { key: "low", label: "Low", index: 0 },
      { key: "high", label: "High", index: 1 },
    ],
  },
};

describe("PairwiseMatrix Cell", () => {
  it("renders only the collective 2-tuple value in read-only mode", () => {
    renderWithProviders(
      <Cell
        expressionDomain={expressionDomain}
        value={{ labelKey: "low", alpha: 0 }}
        collectiveValue={{ labelKey: "high", alpha: 0 }}
        diagonal={false}
        permitEdit={false}
        onChange={vi.fn()}
      />
    );

    expect(screen.getAllByText("High (α = 0)")).toHaveLength(1);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("keeps diagonal cells neutral", () => {
    renderWithProviders(
      <Cell diagonal expressionDomain={expressionDomain} permitEdit={false} onChange={vi.fn()} />
    );

    expect(screen.getByText("Neutral")).toBeInTheDocument();
  });
});
